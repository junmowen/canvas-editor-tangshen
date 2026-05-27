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
  it('keeps highlight and copied text aligned when dragging right without releasing first in mock data', () => {
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
    }).as('mockHoldDragSelection')

    cy.get('@mockHoldDragSelection').then(payload => {
      const { prevPoint, startPoint, endPoint } = payload as {
        prevPoint: CursorPoint
        startPoint: CursorPoint
        endPoint: CursorPoint
      }
      cy.document().then(doc => {
        expect(
          readCanvasBoxStats(doc, prevPoint.pageNo, prevPoint).blueish
        ).to.eq(0)
        expect(
          readCanvasBoxStats(doc, startPoint.pageNo, startPoint).blueish
        ).to.eq(0)
      })

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

    cy.wait(50)

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockHoldDragSelection').then(payload => {
        const { cell, startIndex } = payload as {
          cell: TableCellRef
          startIndex: number
        }
        const rangeText = editor.command.getRangeText()
        expect(rangeText.length).to.be.greaterThan(0)
        expect(rangeText[0]).to.eq(cell.text[startIndex])
      })
    })

    cy.get('@mockHoldDragSelection').then(payload => {
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

  it('starts from the next character when dragging right from the caret line in mock data', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const startIndex = cell.text.indexOf('\u519c\u8d38\u5e02\u573a')
      expect(startIndex).to.be.greaterThan(0)
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
        startPoint,
        endPoint
      }
    }).as('mockCaretLineSelection')

    cy.get('@mockCaretLineSelection').then(payload => {
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
      cy.wrap({
        anchorCursorIndex: cursor!.index,
        pageNo: cursor!.pageNo,
        x: Math.floor(cursor!.coordinate.rightTop[0]),
        y: Math.floor(cursor!.coordinate.leftTop[1] + 2)
      }).as('mockCaretLineAnchor')
    })

    cy.get('@mockCaretLineSelection').then(payload => {
      const { endPoint } = payload as {
        endPoint: CursorPoint
      }
      cy.get('@mockCaretLineAnchor').then(anchorPayload => {
        const anchor = anchorPayload as {
          pageNo: number
          x: number
          y: number
        }
        cy.get(`canvas[data-index="${anchor.pageNo}"]`)
          .scrollIntoView()
          .trigger('mousedown', anchor.x, anchor.y, {
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
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockCaretLineSelection').then(payload => {
        cy.get('@mockCaretLineAnchor').then(anchorPayload => {
          const { cell } = payload as {
            cell: TableCellRef
          }
          const { anchorCursorIndex } = anchorPayload as {
            anchorCursorIndex: number
          }
          const rangeText = editor.command.getRangeText()
          expect(rangeText.length).to.be.greaterThan(0)
          expect(rangeText[0]).to.eq(cell.text[anchorCursorIndex + 1])
        })
      })
    })
  })

  it('does not highlight the previous character when dragging right from the caret before 14天内周围 in mock data', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = getMockPagedCell(editor)
      const startIndex = cell.text.indexOf('14天内周围（如家庭、办公室）')
      expect(startIndex).to.be.greaterThan(0)
      const prevPoint = getCursorPoint(editor, cell, startIndex - 1)
      const startPoint = getCursorPoint(editor, cell, startIndex)
      const endPoint = getCursorPoint(
        editor,
        cell,
        Math.min(cell.text.length - 1, startIndex + 40)
      )
      return {
        cell,
        startIndex,
        prevPoint,
        startPoint,
        endPoint
      }
    }).as('mockLaterFragmentCaretBefore14Selection')

    cy.get('@mockLaterFragmentCaretBefore14Selection').then(payload => {
      const { prevPoint } = payload as {
        prevPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${prevPoint.pageNo}"]`)
        .scrollIntoView()
        .click(prevPoint.x, prevPoint.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      cy.wrap({
        anchorCursorIndex: cursor!.index,
        pageNo: cursor!.pageNo,
        x: Math.floor(cursor!.coordinate.rightTop[0]),
        y: Math.floor(cursor!.coordinate.leftTop[1] + 2)
      }).as('mockLaterFragmentCaretBefore14Anchor')
    })

    cy.get('@mockLaterFragmentCaretBefore14Selection').then(payload => {
      const { endPoint } = payload as {
        endPoint: CursorPoint
      }
      cy.get('@mockLaterFragmentCaretBefore14Anchor').then(anchorPayload => {
        const anchor = anchorPayload as {
          pageNo: number
          x: number
          y: number
        }
        cy.get(`canvas[data-index="${anchor.pageNo}"]`)
          .scrollIntoView()
          .trigger('mousedown', anchor.x, anchor.y, {
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
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mockLaterFragmentCaretBefore14Selection').then(payload => {
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

    cy.get('@mockLaterFragmentCaretBefore14Selection').then(payload => {
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
          startPoint
        ).blueish
        expect(prevCharBlueishAfter).to.eq(0)
        expect(startCharBlueishAfter).to.be.greaterThan(0)
      })
    })
  })
})