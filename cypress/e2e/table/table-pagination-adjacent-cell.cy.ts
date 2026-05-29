import Editor from '../../../src/editor'

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
    coordinate: { leftTop, rightTop }
  } = cursor
  return {
    pageNo,
    x: Math.max(1, Math.floor((leftTop[0] + rightTop[0]) / 2)),
    y: Math.max(1, Math.floor(leftTop[1] + 2))
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

describe('menu-table pagination adjacent cell', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').should($canvas => {
      expect($canvas.length).to.be.greaterThan(2)
    })
  })

  it('supports dragging from a later-page left cell into the adjacent right cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const trIndex = findFirstLaterPageRow(editor)
      const leftCell = getMockPagedCell(editor, trIndex, 0)
      const rightCell = getMockPagedCell(editor, trIndex, 1)
      const leftPoint = getCellPoint(editor, leftCell)
      const rightPoint = getCellPoint(editor, rightCell)
      const interiorY = getRowInteriorY(editor, leftCell)
      expect(leftPoint.pageNo).to.be.greaterThan(0)
      expect(leftPoint.pageNo).to.eq(rightPoint.pageNo)
      const dragOffset = Math.max(
        10,
        Math.floor((rightPoint.x - leftPoint.x) / 4)
      )
      cy.wrap({
        tableId: leftCell.tableId,
        trIndex: leftCell.trIndex,
        leftPoint,
        rightPoint,
        startDragPoint: {
          pageNo: leftPoint.pageNo,
          x: leftPoint.x + dragOffset,
          y: interiorY
        }
      }).as('pagedAdjacentTarget')
    })

    cy.get('@pagedAdjacentTarget').then(payload => {
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

    cy.getEditor().then((editor: Editor) => {
      cy.get('@pagedAdjacentTarget').then(payload => {
        const { tableId, trIndex } = payload as {
          tableId: string
          trIndex: number
        }
        const range = editor.command.getRange()
        expect(range.tableId).to.eq(tableId)
        expect(range.isCrossRowCol).to.eq(true)
        expect(range.startTrIndex).to.eq(trIndex)
        expect(range.endTrIndex).to.eq(trIndex)
        expect(Math.min(range.startTdIndex!, range.endTdIndex!)).to.eq(0)
        expect(Math.max(range.startTdIndex!, range.endTdIndex!)).to.eq(1)
      })
    })
  })
})
