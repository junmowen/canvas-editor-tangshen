import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'

type MergedCellRef = {
  tableId: string
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

function prepareMergedPagedTable(editor: Editor, text: string): MergedCellRef {
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: '\u200B' }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(240, 240)
  editor.command.executeSetPaperMargin([10, 10, 10, 10])
  editor.command.executeInsertTable(2, 2)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  if (!table?.id) {
    throw new Error('table not found')
  }

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: table.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0, table.id, 0, 1, 0, 1)
  editor.command.executeTableSelectAll()
  editor.command.executeMergeTableCell()

  const mergedTable = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  if (!mergedTable?.id) {
    throw new Error('merged table not found')
  }

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: mergedTable.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    text.split('').map(value => ({
      value
    }))
  )

  return {
    tableId: mergedTable!.id!,
    text
  }
}

function setMergedCellCursor(editor: Editor, cell: MergedCellRef, index: number) {
  editor.command.executeSetPositionContext({
    startIndex: index,
    endIndex: index,
    tableId: cell.tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(index, index)
}

function getCursorPoint(editor: Editor, cell: MergedCellRef, index: number): CursorPoint {
  setMergedCellCursor(editor, cell, index)
  const cursor = editor.command.getCursorPosition()
  if (!cursor) {
    throw new Error(`cursor not found ${index}`)
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

function readCanvasBoxStats(
  doc: Document,
  pageNo: number,
  point: CursorPoint
) {
  return readCompositedPageBoxStats(doc, pageNo, point)
}

function toCenterSamplePoint(point: CursorPoint): CursorPoint {
  return {
    ...point,
    x: Math.floor((point.left + point.right) / 2)
  }
}

function findLaterPagePoint(editor: Editor, cell: MergedCellRef) {
  const firstPoint = getCursorPoint(editor, cell, 0)
  for (let index = 0; index < cell.text.length; index += 20) {
    const point = getCursorPoint(editor, cell, index)
    if (point.pageNo > firstPoint.pageNo) {
      for (
        let preciseIndex = Math.max(0, index - 20);
        preciseIndex <= index;
        preciseIndex++
      ) {
        const precisePoint = getCursorPoint(editor, cell, preciseIndex)
        if (precisePoint.pageNo > firstPoint.pageNo) {
          return precisePoint
        }
      }
      return point
    }
  }
  return null
}

function findLaterPageSelectionEndPoint(
  editor: Editor,
  cell: MergedCellRef,
  startPoint: CursorPoint
) {
  for (
    let index = startPoint.index + 1;
    index < cell.text.length;
    index++
  ) {
    const point = getCursorPoint(editor, cell, index)
    if (point.pageNo !== startPoint.pageNo) {
      break
    }
    if (index - startPoint.index >= 8) {
      return point
    }
  }
  return null
}

function findCrossPageSelectionPoints(editor: Editor, cell: MergedCellRef) {
  let previousPoint: CursorPoint | null = null
  for (let index = 10; index < cell.text.length - 10; index += 20) {
    const point = getCursorPoint(editor, cell, index)
    if (
      previousPoint &&
      point.pageNo > previousPoint.pageNo &&
      previousPoint.pageNo >= 1
    ) {
      return {
        startPoint: previousPoint,
        endPoint: point,
        startIndex: previousPoint.index,
        endIndex: point.index
      }
    }
    previousPoint = point
  }
  return null
}

function getPageGapClientPoint(
  doc: Document,
  pageNo: number,
  xOffset: number
) {
  const startPage = doc.querySelector(`canvas[data-index="${pageNo}"]`)
  const endPage = doc.querySelector(`canvas[data-index="${pageNo + 1}"]`)
  expect(startPage).to.not.eq(null)
  expect(endPage).to.not.eq(null)
  const startRect = (startPage as HTMLCanvasElement).getBoundingClientRect()
  const endRect = (endPage as HTMLCanvasElement).getBoundingClientRect()
  return {
    clientX: Math.floor(startRect.left + xOffset),
    clientY: Math.floor((startRect.bottom + endRect.top) / 2)
  }
}

function findLastPointOnPage(
  editor: Editor,
  cell: MergedCellRef,
  pageNo: number
) {
  let lastPoint: CursorPoint | null = null
  for (let index = 0; index < cell.text.length; index += 20) {
    const point = getCursorPoint(editor, cell, index)
    if (point.pageNo !== pageNo) {
      if (lastPoint) {
        for (
          let preciseIndex = Math.max(0, index - 20);
          preciseIndex < index;
          preciseIndex++
        ) {
          const precisePoint = getCursorPoint(editor, cell, preciseIndex)
          if (precisePoint.pageNo === pageNo) {
            lastPoint = precisePoint
          }
        }
        break
      }
      continue
    }
    lastPoint = point
  }
  return lastPoint
}

describe('menu-table pagination merged', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').should($canvas => {
      expect($canvas.length).to.be.greaterThan(2)
    })
  })

  it('clicks inside a non-start merged fragment without jumping back to the first row', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareMergedPagedTable(editor, '0123456789'.repeat(400))
      const point = findLaterPagePoint(editor, cell)
      expect(point).to.not.eq(null)
      return {
        point: point!
      }
    }).as('mergedLaterPoint')

    cy.get('@mergedLaterPoint').then(payload => {
      const { point } = payload as {
        point: CursorPoint
      }
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', Math.max(1, Math.floor(point.left + 1)), point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', Math.max(1, Math.floor(point.left + 1)), point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mergedLaterPoint').then(payload => {
        const { point } = payload as {
          point: CursorPoint
        }
        const cursor = editor.command.getCursorPosition()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.eq(point.pageNo)
        expect(cursor!.index).to.be.greaterThan(0)
        expect(Math.abs(cursor!.index - point.index)).to.be.lessThan(2)
      })
    })
  })

  it('clicks near the bottom of the start merged fragment without collapsing back to the first row', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareMergedPagedTable(editor, '0123456789'.repeat(400))
      const firstPoint = getCursorPoint(editor, cell, 0)
      const point = findLastPointOnPage(editor, cell, firstPoint.pageNo)
      expect(point).to.not.eq(null)
      expect(point!.index).to.be.greaterThan(0)
      return {
        point: point!
      }
    }).as('mergedStartPoint')

    cy.get('@mergedStartPoint').then(payload => {
      const { point } = payload as {
        point: CursorPoint
      }
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mergedStartPoint').then(payload => {
        const { point } = payload as {
          point: CursorPoint
        }
        const cursor = editor.command.getCursorPosition()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.eq(point.pageNo)
        expect(cursor!.index).to.be.greaterThan(0)
        expect(Math.abs(cursor!.index - point.index)).to.be.lessThan(2)
      })
    })
  })

  it('supports drag selection inside a later merged fragment page', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareMergedPagedTable(editor, '0123456789'.repeat(400))
      const startPoint = findLaterPagePoint(editor, cell)
      expect(startPoint).to.not.eq(null)
      const endPoint = findLaterPageSelectionEndPoint(editor, cell, startPoint!)
      expect(endPoint).to.not.eq(null)
      return {
        cell,
        startPoint: startPoint!,
        endPoint: endPoint!
      }
    }).as('mergedLaterSelection')

    cy.get('@mergedLaterSelection').then(payload => {
      const { startPoint, endPoint } = payload as {
        startPoint: CursorPoint
        endPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', Math.max(1, Math.floor(startPoint.left - 2)), startPoint.y, {
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
      cy.get('@mergedLaterSelection').then(payload => {
        const { cell, startPoint } = payload as {
          cell: MergedCellRef
          startPoint: CursorPoint
        }
        const range = editor.command.getRange()
        const rangeText = editor.command.getRangeText()
        expect(range.endIndex).to.be.greaterThan(range.startIndex)
        expect(rangeText.length).to.be.greaterThan(0)
        expect(rangeText[0]).to.eq(cell.text[startPoint.index])
      })
    })
  })

  it('supports reverse drag selection across pages in a merged cell without eating the previous character', () => {
    let selectionPoints:
      | {
          startPoint: CursorPoint
          endPoint: CursorPoint
          startIndex: number
          endIndex: number
        }
      | null = null
    let previousPoint: CursorPoint | null = null
    let gapPoint: { clientX: number; clientY: number } | null = null

    cy.getEditor().then((editor: Editor) => {
      const cell = prepareMergedPagedTable(editor, '0123456789'.repeat(400))
      selectionPoints = findCrossPageSelectionPoints(editor, cell)
      expect(selectionPoints).to.not.eq(null)
      previousPoint = getCursorPoint(editor, cell, selectionPoints!.startIndex - 1)
      return {
        cell
      }
    }).as('mergedReverseSelection')

    cy.window().then(win => {
      expect(selectionPoints).to.not.eq(null)
      gapPoint = getPageGapClientPoint(
        win.document,
        selectionPoints!.startPoint.pageNo,
        selectionPoints!.startPoint.x
      )
    })

    cy.wrap(null).then(() => {
      expect(selectionPoints).to.not.eq(null)
      expect(gapPoint).to.not.eq(null)
      cy.wrap(selectionPoints!.endPoint).as('mergedReverseStartPoint')
      cy.wrap(selectionPoints!.startPoint).as('mergedReverseEndPoint')
      cy.wrap(gapPoint!).as('mergedReverseGapPoint')
    })

    cy.get('@mergedReverseStartPoint').then(start => {
      const point = start as CursorPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.get('@mergedReverseGapPoint').then(point => {
      const gap = point as { clientX: number; clientY: number }
      cy.get('.ce-page-container').trigger('mousemove', {
        clientX: gap.clientX,
        clientY: gap.clientY,
        pageX: gap.clientX,
        pageY: gap.clientY,
        screenX: gap.clientX,
        screenY: gap.clientY,
        button: 0,
        buttons: 1,
        which: 1,
        force: true
      })
    })

    cy.get('@mergedReverseEndPoint').then(end => {
      const point = end as CursorPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .then($canvas => {
          const rect = ($canvas[0] as HTMLCanvasElement).getBoundingClientRect()
          const endClientPoint = {
            clientX: Math.floor(rect.left + point.left),
            clientY: Math.floor(rect.top + point.y)
          }
          cy.get('.ce-page-container')
            .trigger('mousemove', {
              clientX: endClientPoint.clientX,
              clientY: endClientPoint.clientY,
              pageX: endClientPoint.clientX,
              pageY: endClientPoint.clientY,
              screenX: endClientPoint.clientX,
              screenY: endClientPoint.clientY,
              button: 0,
              buttons: 1,
              which: 1,
              force: true
            })
            .trigger('mouseup', {
              clientX: endClientPoint.clientX,
              clientY: endClientPoint.clientY,
              pageX: endClientPoint.clientX,
              pageY: endClientPoint.clientY,
              screenX: endClientPoint.clientX,
              screenY: endClientPoint.clientY,
              button: 0,
              buttons: 1,
              which: 1,
              force: true
            })
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@mergedReverseSelection').then(payload => {
        const { cell } = payload as {
          cell: MergedCellRef
        }
        const range = editor.command.getRange()
        const rangeText = editor.command.getRangeText()
        if (rangeText.length === 0) {
          throw new Error(
            JSON.stringify({
              range,
              cursor: editor.command.getCursorPosition()
            })
          )
        }
        expect(rangeText.length).to.be.greaterThan(10)
        expect(rangeText).to.eq(cell.text.slice(range.startIndex, range.endIndex))
        expect(rangeText[0]).to.eq(cell.text[selectionPoints!.startIndex])
      })
    })

    cy.wait(50)

    cy.document().then(doc => {
      expect(previousPoint).to.not.eq(null)
      expect(selectionPoints).to.not.eq(null)
      const startStats = readCanvasBoxStats(
        doc,
        selectionPoints!.startPoint.pageNo,
        toCenterSamplePoint(selectionPoints!.startPoint)
      )
      expect(startStats.blueish).to.be.greaterThan(0)
    })
  })

  it('does not eat the previous character when dragging from an existing caret in a merged paged cell', () => {
    let caretPoint: CursorPoint | null = null
    let dragEndPoint: CursorPoint | null = null

    cy.getEditor().then((editor: Editor) => {
      const cell = prepareMergedPagedTable(editor, '0123456789'.repeat(400))
      const point = findLaterPagePoint(editor, cell)
      expect(point).to.not.eq(null)
      caretPoint = point!
      dragEndPoint = findLaterPageSelectionEndPoint(editor, cell, caretPoint!)
      expect(dragEndPoint).to.not.eq(null)
      return {
        cell
      }
    }).as('mergedCaretDrag')

    cy.get('@mergedCaretDrag').then(() => {
      const point = caretPoint!
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x + 1, point.y, {
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
      }).as('mergedCaretLinePoint')
    })

    cy.get('@mergedCaretLinePoint').then(payload => {
      const point = payload as { pageNo: number; x: number; y: number }
      const endPoint = dragEndPoint!
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
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
      cy.get('@mergedCaretDrag').then(payload => {
        cy.get('@mergedCaretLinePoint').then(anchorPayload => {
          const { cell } = payload as {
            cell: MergedCellRef
          }
          const { anchorCursorIndex } = anchorPayload as {
            anchorCursorIndex: number
          }
          const range = editor.command.getRange()
          const rangeText = editor.command.getRangeText()
          expect(range.endIndex).to.be.greaterThan(range.startIndex)
          expect(rangeText.length).to.be.greaterThan(0)
          expect(rangeText[0]).to.eq(cell.text[anchorCursorIndex + 1])
        })
      })
    })
  })
})
