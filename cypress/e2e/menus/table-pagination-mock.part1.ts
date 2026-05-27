import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'

type TableCellRef = {
  tableId: string
  trIndex: number
  tdIndex: number
  text: string
}

type CursorPoint = {
  index: number
  pageNo: number
  x: number
  y: number
  left: number
  right: number
  top: number
  bottom: number
}

function getMockPagedCell(editor: Editor): TableCellRef {
  const value = editor.command.getValue({
    extraPickAttrs: ['id']
  })
  const tables = value.data.main.filter(element => element.type === 'table')
  const table = tables[tables.length - 1]
  if (!table?.id) {
    throw new Error('mock table not found')
  }
  const trIndex = 8
  const tdIndex = 0
  const td = table.trList?.[trIndex]?.tdList?.[tdIndex]
  const text = td?.value?.map(element => element.value).join('') || ''
  if (!text.length) {
    throw new Error('mock paged td not found')
  }
  return {
    tableId: table.id,
    trIndex,
    tdIndex,
    text
  }
}

function setTableCursor(editor: Editor, cell: TableCellRef, index: number) {
  editor.command.executeSetPositionContext({
    startIndex: index,
    endIndex: index,
    tableId: cell.tableId,
    startTdIndex: cell.tdIndex,
    endTdIndex: cell.tdIndex,
    startTrIndex: cell.trIndex,
    endTrIndex: cell.trIndex
  } as any)
  editor.command.executeSetRange(index, index)
}

function getCursorPoint(
  editor: Editor,
  cell: TableCellRef,
  index: number
): CursorPoint {
  setTableCursor(editor, cell, index)
  const cursor = editor.command.getCursorPosition()
  if (!cursor) {
    throw new Error(`cursor not found at index ${index}`)
  }
  const {
    pageNo,
    coordinate: { leftTop, rightTop, rightBottom }
  } = cursor
  return {
    index,
    pageNo,
    x: Math.floor((leftTop[0] + rightTop[0]) / 2),
    y: Math.floor(leftTop[1] + 2),
    left: leftTop[0],
    right: rightTop[0],
    top: leftTop[1],
    bottom: rightBottom[1]
  }
}

function findPageBoundary(editor: Editor, cell: TableCellRef) {
  let prev = getCursorPoint(editor, cell, 0)
  for (let index = 1; index < cell.text.length; index++) {
    const next = getCursorPoint(editor, cell, index)
    if (next.pageNo > prev.pageNo) {
      return {
        prev,
        next
      }
    }
    prev = next
  }
  return null
}

function getLaterFragmentStartPoint(editor: Editor, cell: TableCellRef) {
  const boundary = findPageBoundary(editor, cell)
  if (!boundary) {
    return null
  }
  return {
    ...boundary.next,
    x: Math.max(1, Math.floor(boundary.next.left + 1))
  }
}

function toLeftEdgeDragPoint(point: CursorPoint): CursorPoint {
  return {
    ...point,
    x: Math.max(1, Math.floor(point.left + 1))
  }
}

function toCenterSamplePoint(point: CursorPoint): CursorPoint {
  return {
    ...point,
    x: Math.floor((point.left + point.right) / 2)
  }
}

function readCanvasBoxStats(
  doc: Document,
  pageNo: number,
  point: CursorPoint
) {
  return readCompositedPageBoxStats(doc, pageNo, point)
}

function findPagedCellBottomPointOnPage(
  editor: Editor,
  cell: TableCellRef,
  pageNo: number
) {
  let targetPoint: CursorPoint | null = null
  for (let index = 0; index < cell.text.length; index++) {
    const point = getCursorPoint(editor, cell, index)
    if (point.pageNo !== pageNo) continue
    if (!targetPoint || point.top > targetPoint.top) {
      targetPoint = point
    }
  }
  return targetPoint
}

function findMockPageCursorPoint(
  editor: Editor,
  cell: TableCellRef,
  targetPageNo: number
) {
  for (let index = 0; index < cell.text.length; index++) {
    const point = getCursorPoint(editor, cell, index)
    if (point.pageNo === targetPageNo) {
      return point
    }
  }
  return null
}

function findMockEmptyRowCellPoints(win: Window, editor: Editor) {
  const hits: Array<{
    pageNo: number
    x: number
    y: number
    trIndex: number
    tdIndex: number
  }> = []
  const canvasList = Array.from(
    win.document.querySelectorAll('canvas[data-index]')
  ) as HTMLCanvasElement[]
  canvasList.forEach(canvas => {
    const rect = canvas.getBoundingClientRect()
    const pageNo = Number(canvas.dataset.index || 0)
    for (let y = 20; y < rect.height - 20; y += 10) {
      for (let x = 20; x < rect.width - 20; x += 14) {
        const evt = new win.MouseEvent('mousemove', {
          bubbles: true,
          clientX: rect.left + x,
          clientY: rect.top + y
        })
        Object.defineProperty(evt, 'target', {
          configurable: true,
          value: canvas
        })
        Object.defineProperty(evt, 'offsetX', {
          configurable: true,
          value: x
        })
        Object.defineProperty(evt, 'offsetY', {
          configurable: true,
          value: y
        })
        const hit = editor.command.getPositionContextByEvent(evt, {
          isMustDirectHit: false
        })
        if (hit?.tableInfo?.trIndex === 9) {
          hits.push({
            pageNo,
            x,
            y,
            trIndex: hit.tableInfo.trIndex,
            tdIndex: hit.tableInfo.tdIndex
          })
        }
      }
    }
  })
  const leftHit = hits.find(hit => hit.tdIndex === 0)
  const rightHit = hits.find(
    hit => hit.tdIndex === 1 && hit.pageNo === leftHit?.pageNo && hit.y === leftHit?.y
  )
  if (!leftHit || !rightHit) {
    return null
  }
  return {
    leftHit,
    rightHit
  }
}

describe('menu-table pagination mock', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.getEditor().then((editor: any) => {
      const draw = editor.draw
      const pageCount = draw.getPageCanvasHost().getPageCount()
      expect(pageCount).to.be.greaterThan(2)
      // canvas 池改造后默认只挂载可视页；
      // 该专项会按跨页坐标直接访问指定页 canvas，因此测试前显式渲染全部页。
      draw.getServices().pageRenderer.immediateRender()
    })
    cy.get('canvas[data-index]').should($canvas => {
      expect($canvas.length).to.be.greaterThan(2)
    })
  })
  it('highlights the first character in the later paged fragment first row from mock data', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const boundary = findPageBoundary(editor, cell)
      expect(boundary).to.not.eq(null)
      const firstCharPoint = boundary!.next
      const secondCharPoint = getCursorPoint(
        editor,
        cell,
        boundary!.next.index + 1
      )
      const endPoint = getCursorPoint(
        editor,
        cell,
        Math.min(cell.text.length - 1, boundary!.next.index + 5)
      )
      return {
        cell,
        firstCharPoint,
        secondCharPoint,
        endPoint
      }
    }).as('mockSelection')

    cy.get('@mockSelection').then(payload => {
      const selection = payload as {
        cell: TableCellRef
        firstCharPoint: CursorPoint
        secondCharPoint: CursorPoint
        endPoint: CursorPoint
      }
      cy.document().then(doc => {
        const firstCharBlueishBefore = readCanvasBoxStats(
          doc,
          selection.firstCharPoint.pageNo,
          selection.firstCharPoint
        ).blueish
        const secondCharBlueishBefore = readCanvasBoxStats(
          doc,
          selection.secondCharPoint.pageNo,
          selection.secondCharPoint
        ).blueish

        expect(firstCharBlueishBefore).to.eq(0)
        expect(secondCharBlueishBefore).to.eq(0)
      })

      cy.get(`canvas[data-index="${selection.firstCharPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger(
          'mousedown',
          Math.max(1, Math.floor(selection.firstCharPoint.left - 2)),
          selection.firstCharPoint.y,
          {
            button: 0,
            force: true
          }
        )
        .trigger('mousemove', selection.endPoint.x, selection.endPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', selection.endPoint.x, selection.endPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.wait(50)

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockSelection').then(payload => {
        const selection = payload as {
          cell: TableCellRef
          firstCharPoint: CursorPoint
          secondCharPoint: CursorPoint
          endPoint: CursorPoint
        }
        const range = editor.command.getRange()
        const rangeText = editor.command.getRangeText()
        expect(range.endIndex).to.be.greaterThan(range.startIndex)
        expect(rangeText.length).to.be.greaterThan(0)
        expect(rangeText[0]).to.eq(selection.cell.text[selection.firstCharPoint.index])
      })
    })

    cy.get('@mockSelection').then(payload => {
      const selection = payload as {
        firstCharPoint: CursorPoint
        secondCharPoint: CursorPoint
      }
      cy.document().then(doc => {
        const firstCharBlueishAfter = readCanvasBoxStats(
          doc,
          selection.firstCharPoint.pageNo,
          selection.firstCharPoint
        ).blueish
        const secondCharBlueishAfter = readCanvasBoxStats(
          doc,
          selection.secondCharPoint.pageNo,
          selection.secondCharPoint
        ).blueish

        expect(firstCharBlueishAfter).to.be.greaterThan(0)
        expect(secondCharBlueishAfter).to.be.greaterThan(0)
      })
    })
  })

  it('moves up from the actual later fragment start point into the previous fragment of the same mock cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const startPoint = getLaterFragmentStartPoint(editor, cell)
      expect(startPoint).to.not.eq(null)
      cy.wrap({
        cell,
        startPoint: startPoint!
      }).as('mockActualLaterFragmentStart')
    })

    cy.get('@mockActualLaterFragmentStart').then(payload => {
      const { startPoint } = payload as {
        startPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .scrollIntoView()
        .click(startPoint.x, startPoint.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      const rawRange = (editor as any).draw.getRange().getEditBoundaryRange()
      cy.wrap({
        clickedPageNo: cursor!.pageNo,
        clickedRawIndex: rawRange.startIndex
      }).as('mockActualLaterFragmentClicked')
    })

    cy.get('.ce-inputarea').type('{uparrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockActualLaterFragmentStart').then(payload => {
        cy.get('@mockActualLaterFragmentClicked').then(clickedPayload => {
          const { cell } = payload as {
            cell: TableCellRef
          }
          const { clickedPageNo, clickedRawIndex } = clickedPayload as {
            clickedPageNo: number
            clickedRawIndex: number
          }
          const cursor = editor.command.getCursorPosition()
          const draw = (editor as any).draw
          const context = draw.getPosition().getPositionContext()
          const rawRange = draw.getRange().getEditBoundaryRange()
          expect(cursor).to.not.eq(null)
          expect(cursor!.pageNo).to.be.lessThan(clickedPageNo)
          expect(cursor!.index).to.be.lessThan(clickedRawIndex)
          expect(rawRange.startIndex).to.be.at.most(clickedRawIndex)
          expect(context.isTable).to.eq(true)
          expect(context.trIndex).to.eq(cell.trIndex)
          expect(context.tdIndex).to.eq(cell.tdIndex)
        })
      })
    })
  })

  it('moves down from the actual later fragment start point through the next two lines of the same mock cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const boundary = findPageBoundary(editor, cell)
      expect(boundary).to.not.eq(null)

      const pointA = {
        ...boundary!.next,
        x: Math.max(1, Math.floor(boundary!.next.left + 1))
      }

      let pointB: CursorPoint | null = null
      let pointC: CursorPoint | null = null
      for (let index = pointA.index + 1; index < cell.text.length; index++) {
        const point = getCursorPoint(editor, cell, index)
        if (point.pageNo === pointA.pageNo && point.top > pointA.top) {
          pointB = {
            ...point,
            x: Math.max(1, Math.floor(point.left + 1))
          }
          break
        }
      }
      for (let index = (pointB?.index ?? pointA.index) + 1; index < cell.text.length; index++) {
        const point = getCursorPoint(editor, cell, index)
        if (
          pointB &&
          point.pageNo === pointB.pageNo &&
          point.top > pointB.top
        ) {
          pointC = {
            ...point,
            x: Math.max(1, Math.floor(point.left + 1))
          }
          break
        }
      }

      expect(pointB).to.not.eq(null)
      expect(pointC).to.not.eq(null)
      cy.wrap({
        cell,
        pointA,
        pointB: pointB!,
        pointC: pointC!
      }).as('mockActualLaterFragmentDown')
    })

    cy.get('@mockActualLaterFragmentDown').then(payload => {
      const { pointA } = payload as {
        pointA: CursorPoint
      }
      cy.get(`canvas[data-index="${pointA.pageNo}"]`)
        .scrollIntoView()
        .click(pointA.x, pointA.y, {
          force: true
        })
    })

    cy.get('.ce-inputarea').type('{downarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockActualLaterFragmentDown').then(payload => {
        const { cell, pointA, pointB } = payload as {
          cell: TableCellRef
          pointA: CursorPoint
          pointB: CursorPoint
        }
        const cursor = editor.command.getCursorPosition()
        const draw = (editor as any).draw
        const context = draw.getPosition().getPositionContext()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.eq(pointB.pageNo)
        expect(draw.getRange().getEditBoundaryRange().startIndex).to.be.greaterThan(pointA.index)
        expect(context.trIndex).to.eq(cell.trIndex)
        expect(context.tdIndex).to.eq(cell.tdIndex)
      })
    })

    cy.get('.ce-inputarea').type('{downarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockActualLaterFragmentDown').then(payload => {
        const { cell, pointC } = payload as {
          cell: TableCellRef
          pointC: CursorPoint
        }
        const cursor = editor.command.getCursorPosition()
        const draw = (editor as any).draw
        const context = draw.getPosition().getPositionContext()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.eq(pointC.pageNo)
        expect(cursor!.coordinate.leftTop[1]).to.eq(pointC.top)
        expect(context.trIndex).to.eq(cell.trIndex)
        expect(context.tdIndex).to.eq(cell.tdIndex)
      })
    })
  })

  it('moves down across the actual page boundary into the next fragment start of the same mock cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const boundary = findPageBoundary(editor, cell)
      expect(boundary).to.not.eq(null)
      cy.wrap({
        cell,
        boundary: boundary!
      }).as('mockActualCrossPageDown')
    })

    cy.get('@mockActualCrossPageDown').then(payload => {
      const { boundary } = payload as {
        boundary: { prev: CursorPoint }
      }
      cy.get(`canvas[data-index="${boundary.prev.pageNo}"]`)
        .scrollIntoView()
        .click(boundary.prev.x, boundary.prev.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      cy.wrap({
        clickedRawIndex: draw.getRange().getEditBoundaryRange().startIndex,
        clickedPageNo: editor.command.getCursorPosition()!.pageNo
      }).as('mockActualCrossPageDownBefore')
    })

    cy.get('.ce-inputarea').type('{downarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockActualCrossPageDown').then(payload => {
        cy.get('@mockActualCrossPageDownBefore').then(beforePayload => {
          const { cell, boundary } = payload as {
            cell: TableCellRef
            boundary: { next: CursorPoint }
          }
          const { clickedRawIndex, clickedPageNo } = beforePayload as {
            clickedRawIndex: number
            clickedPageNo: number
          }
          const cursor = editor.command.getCursorPosition()
          const draw = (editor as any).draw
          const rawRange = draw.getRange().getEditBoundaryRange()
          const context = draw.getPosition().getPositionContext()
          expect(cursor).to.not.eq(null)
          expect(cursor!.pageNo).to.be.greaterThan(clickedPageNo)
          expect(rawRange.startIndex).to.be.greaterThan(clickedRawIndex)
          expect(cursor!.coordinate.leftTop[0]).to.eq(boundary.next.left)
          expect(cursor!.coordinate.leftTop[1]).to.eq(boundary.next.top)
          expect(context.trIndex).to.eq(cell.trIndex)
          expect(context.tdIndex).to.eq(cell.tdIndex)
        })
      })
    })
  })

  it('moves down from the later-page tail of the paged cell into the next row cell', () => {
    cy.window().then(win => {
      const editor = (win as any).editor as Editor
      const cell = getMockPagedCell(editor)
      const emptyRowTarget = findMockEmptyRowCellPoints(win, editor)
      expect(emptyRowTarget).to.not.eq(null)
      const startPoint = findPagedCellBottomPointOnPage(
        editor,
        cell,
        emptyRowTarget!.leftHit.pageNo
      )
      expect(startPoint).to.not.eq(null)
      cy.wrap({
        cell,
        startPoint: startPoint!,
        emptyRowTarget: emptyRowTarget!
      }).as('mockTailDownToNextRow')
    })

    cy.get('@mockTailDownToNextRow').then(payload => {
      const { startPoint } = payload as {
        startPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .scrollIntoView()
        .click(startPoint.x, startPoint.y, {
          force: true
        })
    })

    cy.get('.ce-inputarea').type('{downarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockTailDownToNextRow').then(payload => {
        const { cell, emptyRowTarget } = payload as {
          cell: TableCellRef
          emptyRowTarget: {
            leftHit: { pageNo: number }
          }
        }
        const cursor = editor.command.getCursorPosition()
        const draw = (editor as any).draw
        const context = draw.getPosition().getPositionContext()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.eq(emptyRowTarget.leftHit.pageNo)
        expect(context.isTable).to.eq(true)
        expect(context.trIndex).to.eq(cell.trIndex + 1)
        expect(context.tdIndex).to.eq(cell.tdIndex)
      })
    })
  })

  it('keeps the caret near the later-page tail when clicking the paged cell bottom point', () => {
    cy.window().then(win => {
      const editor = (win as any).editor as Editor
      const cell = getMockPagedCell(editor)
      const emptyRowTarget = findMockEmptyRowCellPoints(win, editor)
      expect(emptyRowTarget).to.not.eq(null)
      const startPoint = findPagedCellBottomPointOnPage(
        editor,
        cell,
        emptyRowTarget!.leftHit.pageNo
      )
      expect(startPoint).to.not.eq(null)
      cy.wrap({
        cell,
        startPoint: startPoint!,
        fragmentPageNo: emptyRowTarget!.leftHit.pageNo
      }).as('mockTailClickPoint')
    })

    cy.get('@mockTailClickPoint').then(payload => {
      const { startPoint } = payload as {
        startPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .scrollIntoView()
        .click(startPoint.x, startPoint.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockTailClickPoint').then(payload => {
        const { cell, startPoint, fragmentPageNo } = payload as {
          cell: TableCellRef
          startPoint: CursorPoint
          fragmentPageNo: number
        }
        const cursor = editor.command.getCursorPosition()
        const draw = (editor as any).draw
        const context = draw.getPosition().getPositionContext()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.eq(fragmentPageNo)
        expect(cursor!.index).to.be.at.least(startPoint.index)
        expect(context.isTable).to.eq(true)
        expect(context.trIndex).to.eq(cell.trIndex)
        expect(context.tdIndex).to.eq(cell.tdIndex)
      })
    })
  })

  it('double click twice inside a third-page mock cell fragment does not select the whole document', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const page2Point = findMockPageCursorPoint(editor, cell, 2)
      expect(page2Point).to.not.eq(null)
      cy.wrap({
        cell,
        page2Point: page2Point!
      }).as('mockThirdPageDblclickPoint')
    })

    cy.get('@mockThirdPageDblclickPoint').then(payload => {
      const { page2Point } = payload as {
        page2Point: CursorPoint
      }
      cy.get(`canvas[data-index="${page2Point.pageNo}"]`)
        .scrollIntoView()
        .click(page2Point.x, page2Point.y, {
          button: 0,
          force: true
        })
        .dblclick(page2Point.x, page2Point.y, {
          button: 0,
          force: true
        })
        .dblclick(page2Point.x, page2Point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockThirdPageDblclickPoint').then(payload => {
        const { cell } = payload as {
          cell: TableCellRef
        }
        const rangeText = editor.command.getRangeText()
        expect(rangeText).to.eq(cell.text)
        expect(rangeText.includes('农贸市场')).to.eq(true)
        expect(rangeText.includes('canvas-editor')).to.eq(false)
      })
    })
  })

  it('selects the logical row matching the current paged fragment row tool click in mock data', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const startPoint = getLaterFragmentStartPoint(editor, cell)
      expect(startPoint).to.not.eq(null)
      cy.wrap({
        cell,
        startPoint: startPoint!
      }).as('mockRowToolTarget')
    })

    cy.get('@mockRowToolTarget').then(payload => {
      const { startPoint } = payload as {
        startPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .scrollIntoView()
        .click(startPoint.x, startPoint.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const tableTool = draw.getComponents().tableTool as any
      const rowContainer = tableTool.toolRowContainer as HTMLDivElement | null
      expect(rowContainer).to.not.eq(null)
      const activeIndex = Array.from(rowContainer!.children).findIndex(child =>
        child.classList.contains('active')
      )
      expect(activeIndex).to.be.greaterThan(-1)
      ;(rowContainer!.children[activeIndex] as HTMLDivElement).click()
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockRowToolTarget').then(payload => {
        const { cell } = payload as {
          cell: TableCellRef
        }
        const range = editor.command.getRange()
        expect(range.isCrossRowCol).to.eq(true)
        expect(range.startTrIndex).to.eq(cell.trIndex)
        expect(range.endTrIndex).to.eq(cell.trIndex)
        expect(Math.min(range.startTdIndex!, range.endTdIndex!)).to.eq(0)
        expect(Math.max(range.startTdIndex!, range.endTdIndex!)).to.eq(1)
      })
    })
  })

  it('does not highlight the lower mock fragment when selecting only within the upper fragment', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const boundary = findPageBoundary(editor, cell)
      expect(boundary).to.not.eq(null)
      const upperStartIndex = Math.max(0, boundary!.prev.index - 20)
      const upperStartPoint = getCursorPoint(editor, cell, upperStartIndex)
      const upperEndPoint = getCursorPoint(editor, cell, boundary!.prev.index)
      const lowerSampleIndexes = [
        boundary!.next.index,
        Math.min(cell.text.length - 1, boundary!.next.index + 1),
        Math.min(cell.text.length - 1, boundary!.next.index + 6)
      ]
      const lowerPoints = lowerSampleIndexes
        .map(index => getCursorPoint(editor, cell, index))
        .filter(point => point.pageNo === boundary!.next.pageNo)
      return {
        upperStartPoint,
        upperEndPoint,
        lowerPoints
      }
    }).as('mockUpperOnlySelection')

    cy.get('@mockUpperOnlySelection').then(payload => {
      const { lowerPoints } = payload as {
        lowerPoints: CursorPoint[]
      }
      cy.document().then(doc => {
        lowerPoints.forEach(point => {
          expect(readCanvasBoxStats(doc, point.pageNo, point).blueish).to.eq(0)
        })
      })
    })

    cy.get('@mockUpperOnlySelection').then(payload => {
      const { upperStartPoint, upperEndPoint } = payload as {
        upperStartPoint: CursorPoint
        upperEndPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${upperStartPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', upperStartPoint.x, upperStartPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', upperEndPoint.x, upperEndPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', upperEndPoint.x, upperEndPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.get('@mockUpperOnlySelection').then(payload => {
      const { lowerPoints } = payload as {
        lowerPoints: CursorPoint[]
      }
      cy.document().then(doc => {
        lowerPoints.forEach(point => {
          expect(readCanvasBoxStats(doc, point.pageNo, point).blueish).to.eq(0)
        })
      })
    })
  })

  it('does not drop the clicked CJK character when dragging again from the same char box in mock data', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const startIndex = cell.text.indexOf('\u519c\u8d38\u5e02\u573a')
      expect(startIndex).to.be.greaterThan(0)
      const prevPoint = getCursorPoint(editor, cell, startIndex - 1)
      const startPoint = toLeftEdgeDragPoint(
        getCursorPoint(editor, cell, startIndex)
      )
      const endPoint = getCursorPoint(
        editor,
        cell,
        Math.min(cell.text.length - 1, startIndex + 20)
      )
      return {
        cell,
        startIndex,
        prevPoint,
        startPoint,
        endPoint
      }
    }).as('mockSameCharSelection')

    cy.get('@mockSameCharSelection').then(payload => {
      const { startPoint } = payload as {
        startPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .scrollIntoView()
        .click(startPoint.x, startPoint.y, {
          force: true
        })
    })

    cy.get('@mockSameCharSelection').then(payload => {
      const { startPoint, endPoint } = payload as {
        startPoint: CursorPoint
        endPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', startPoint.x, startPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', endPoint.x, endPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', endPoint.x, endPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockSameCharSelection').then(payload => {
        const { cell, startIndex } = payload as {
          cell: TableCellRef
          startIndex: number
        }
        const rangeText = editor.command.getRangeText()
        expect(rangeText.length).to.be.greaterThan(0)
        expect(rangeText[0]).to.eq(cell.text[startIndex])
      })
    })

    cy.wait(50)

    cy.get('@mockSameCharSelection').then(payload => {
      const { prevPoint, startPoint } = payload as {
        prevPoint: CursorPoint
        startPoint: CursorPoint
      }
      cy.document().then(doc => {
        const prevCharBlueishAfter = readCanvasBoxStats(
          doc,
          prevPoint.pageNo,
          prevPoint
        ).blueish
        const startCharBlueishAfter = readCanvasBoxStats(
          doc,
          startPoint.pageNo,
          toCenterSamplePoint(startPoint)
        ).blueish
        expect(prevCharBlueishAfter).to.eq(0)
        expect(startCharBlueishAfter).to.be.greaterThan(0)
      })
    })
  })
})