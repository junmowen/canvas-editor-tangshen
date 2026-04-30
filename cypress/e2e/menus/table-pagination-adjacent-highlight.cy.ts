import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'

type MockCellRef = {
  tableId: string
  trIndex: number
  tdIndex: number
  text: string
}

type CellPoint = {
  pageNo: number
  x: number
  y: number
  left: number
  right: number
  top: number
  bottom: number
}

function getMockPagedCell(
  editor: Editor,
  trIndex: number,
  tdIndex: number
): MockCellRef {
  const value = editor.command.getValue({
    extraPickAttrs: ['id']
  })
  const table = value.data.main.filter(element => element.type === 'table').slice(-1)[0]
  if (!table?.id) {
    throw new Error('mock table not found')
  }
  const text =
    table.trList?.[trIndex]?.tdList?.[tdIndex]?.value
      ?.map(element => element.value)
      .join('') || ''
  if (!text.length) {
    throw new Error(`mock paged cell not found ${trIndex}-${tdIndex}`)
  }
  return {
    tableId: table.id,
    trIndex,
    tdIndex,
    text
  }
}

function setTableCursor(editor: Editor, cell: MockCellRef, index: number) {
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

function getCellPoint(editor: Editor, cell: MockCellRef): CellPoint {
  setTableCursor(editor, cell, 0)
  const cursor = editor.command.getCursorPosition()
  if (!cursor) {
    throw new Error(`cursor not found ${cell.trIndex}-${cell.tdIndex}`)
  }
  const {
    pageNo,
    coordinate: { leftTop, rightTop, rightBottom }
  } = cursor
  return {
    pageNo,
    x: Math.max(1, Math.floor((leftTop[0] + rightTop[0]) / 2)),
    y: Math.max(1, Math.floor(leftTop[1] + 2)),
    left: leftTop[0],
    right: rightTop[0],
    top: leftTop[1],
    bottom: rightBottom[1]
  }
}

function getRowInteriorY(editor: Editor, cell: MockCellRef) {
  const currentPoint = getCellPoint(editor, cell)
  const nextRowPoint = getCellPoint(editor, {
    ...cell,
    trIndex: cell.trIndex + 1
  })
  if (nextRowPoint.pageNo !== currentPoint.pageNo) {
    return currentPoint.y
  }
  return Math.max(currentPoint.y, Math.floor((currentPoint.y + nextRowPoint.y) / 2))
}

function findFirstLaterPageRow(editor: Editor) {
  let previousPageNo = -1
  for (let trIndex = 0; trIndex < 40; trIndex++) {
    let leftCell: MockCellRef
    let rightCell: MockCellRef
    try {
      leftCell = getMockPagedCell(editor, trIndex, 0)
      rightCell = getMockPagedCell(editor, trIndex, 1)
    } catch {
      continue
    }
    const point = getCellPoint(editor, leftCell)
    const rightPoint = getCellPoint(editor, rightCell)
    if (
      point.pageNo > 0 &&
      point.pageNo !== previousPageNo &&
      point.pageNo === rightPoint.pageNo
    ) {
      return trIndex
    }
    previousPageNo = point.pageNo
  }
  return 8
}

describe('menu-table pagination adjacent highlight', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('shows highlight before merging from a later-page left text cell into the adjacent right cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const trIndex = findFirstLaterPageRow(editor)
      const leftCell = getMockPagedCell(editor, trIndex, 0)
      const rightCell = getMockPagedCell(editor, trIndex, 1)
      const leftPoint = getCellPoint(editor, leftCell)
      const rightPoint = getCellPoint(editor, rightCell)
      const interiorY = getRowInteriorY(editor, leftCell)
      const dragOffset = Math.max(10, Math.floor((rightPoint.x - leftPoint.x) / 4))
      cy.wrap({
        leftPoint,
        rightPoint,
        startDragPoint: {
          pageNo: leftPoint.pageNo,
          x: leftPoint.x + dragOffset,
          y: interiorY,
          left: leftPoint.left,
          right: leftPoint.right,
          top: leftPoint.top,
          bottom: leftPoint.bottom
        }
      }).as('adjacentHighlightTarget')
    })

    cy.get('@adjacentHighlightTarget').then(payload => {
      const { startDragPoint, rightPoint } = payload as {
        startDragPoint: CellPoint
        rightPoint: CellPoint
      }
      cy.get(`canvas[data-index="${startDragPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', startDragPoint.x, startDragPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', rightPoint.x, rightPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', rightPoint.x, rightPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.wait(50)

    cy.get('@adjacentHighlightTarget').then(payload => {
      const { startDragPoint, rightPoint } = payload as {
        startDragPoint: CellPoint
        rightPoint: CellPoint
      }
      cy.document().then(doc => {
        const leftBlueish = readCompositedPageBoxStats(doc, startDragPoint.pageNo, {
          left: startDragPoint.left,
          right: startDragPoint.right,
          top: startDragPoint.top,
          bottom: startDragPoint.bottom
        }).blueish
        const rightBlueish = readCompositedPageBoxStats(doc, rightPoint.pageNo, {
          left: rightPoint.left,
          right: rightPoint.right,
          top: rightPoint.top,
          bottom: rightPoint.bottom
        }).blueish
        expect(leftBlueish).to.be.greaterThan(0)
        expect(rightBlueish).to.be.greaterThan(0)
      })
    })
  })
})
