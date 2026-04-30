import Editor from '../../../src/editor'

function preparePagedTwoColTable(
  editor: Editor,
  leftSeed: string,
  rightSeed: string
) {
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
  editor.command.executePaperSize(240, 140)
  editor.command.executeSetPaperMargin([10, 10, 10, 10])
  editor.command.executeInsertTable(1, 2)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  const tableId = table.id!

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId,
    startTdIndex: 1,
    endTdIndex: 1,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    rightSeed.split('').map(value => ({
      value
    }))
  )

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    leftSeed.split('').map(value => ({
      value
    }))
  )

  return tableId
}

function preparePagedTwoRowTable(
  editor: Editor,
  topSeed: string,
  bottomSeed: string
) {
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
  editor.command.executeInsertTable(2, 1)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  const tableId = table.id!

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 1,
    endTrIndex: 1
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    bottomSeed.split('').map(value => ({
      value
    }))
  )

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    topSeed.split('').map(value => ({
      value
    }))
  )

  return tableId
}

function getCellText(editor: Editor, tableId: string, tdIndex: number) {
  return (
    editor.command
      .getValue({
        extraPickAttrs: ['id']
      })
      .data.main.find(element => element.type === 'table' && element.id === tableId)
      ?.trList?.[0]?.tdList?.[tdIndex]?.value
      ?.map(element => element.value)
      .join('') || ''
  )
}

function setTableCursor(editor: Editor, tableId: string, tdIndex: number, index: number) {
  editor.command.executeSetPositionContext({
    startIndex: index,
    endIndex: index,
    tableId,
    startTdIndex: tdIndex,
    endTdIndex: tdIndex,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(index, index, tableId, tdIndex, tdIndex, 0, 0)
}

function setTableCursorByCell(
  editor: Editor,
  tableId: string,
  trIndex: number,
  tdIndex: number,
  index: number
) {
  editor.command.executeSetPositionContext({
    startIndex: index,
    endIndex: index,
    tableId,
    startTdIndex: tdIndex,
    endTdIndex: tdIndex,
    startTrIndex: trIndex,
    endTrIndex: trIndex
  } as any)
  editor.command.executeSetRange(index, index, tableId, tdIndex, tdIndex, trIndex, trIndex)
}

function findLaterPagePoint(
  editor: Editor,
  tableId: string,
  tdIndex: number,
  textLength: number
) {
  for (let index = 0; index < textLength; index += 10) {
    setTableCursor(editor, tableId, tdIndex, index)
    const cursor = editor.command.getCursorPosition()
    if (cursor && cursor.pageNo > 1) {
      return {
        index,
        pageNo: cursor.pageNo,
        x: Math.floor(
          (cursor.coordinate.leftTop[0] + cursor.coordinate.rightTop[0]) / 2
        ),
        y: Math.floor(cursor.coordinate.leftTop[1] + 2)
      }
    }
  }
  return null
}

function findLaterPageLastLinePointByCell(
  editor: Editor,
  tableId: string,
  trIndex: number,
  tdIndex: number,
  textLength: number,
  minPageNo = 1
) {
  let candidate:
    | {
        index: number
        pageNo: number
        x: number
        y: number
      }
    | null = null

  for (let index = 0; index < textLength; index += 5) {
    setTableCursorByCell(editor, tableId, trIndex, tdIndex, index)
    const cursor = editor.command.getCursorPosition()
    if (!cursor || cursor.pageNo < minPageNo) {
      continue
    }
    const point = {
      index,
      pageNo: cursor.pageNo,
      x: Math.floor(
        (cursor.coordinate.leftTop[0] + cursor.coordinate.rightTop[0]) / 2
      ),
      y: Math.floor(cursor.coordinate.leftTop[1] + 2)
    }
    if (
      !candidate ||
      point.pageNo > candidate.pageNo ||
      (point.pageNo === candidate.pageNo && point.y >= candidate.y)
    ) {
      candidate = point
    }
  }

  return candidate
}

describe('menu-table pagination multicell', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('clicks and types inside a later-page second cell', () => {
    const seed = '0123456789'.repeat(1200)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTwoColTable(editor, seed, seed)
      const point = findLaterPagePoint(editor, tableId, 1, seed.length)
      expect(point).to.not.eq(null)
      cy.wrap({ tableId, point: point!, seedLength: seed.length }).as('laterSecondCell')
    })

    cy.get('@laterSecondCell').then(payload => {
      const { point } = payload as {
        point: { pageNo: number; x: number; y: number }
      }
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x, point.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@laterSecondCell').then(payload => {
        const { point } = payload as {
          point: { pageNo: number }
        }
        const cursor = editor.command.getCursorPosition()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.eq(point.pageNo)
      })
    })

    cy.get('.ce-inputarea').type('X', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@laterSecondCell').then(payload => {
        const { tableId } = payload as { tableId: string }
        expect(getCellText(editor, tableId, 1)).to.include('X')
      })
    })
  })

  it('moves up from a later-page second cell into the previous fragment of the same cell', () => {
    const seed = '0123456789'.repeat(1200)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTwoColTable(editor, seed, seed)
      const point = findLaterPagePoint(editor, tableId, 1, seed.length)
      expect(point).to.not.eq(null)
      cy.wrap({ tableId, point: point! }).as('laterSecondCellUp')
    })

    cy.get('@laterSecondCellUp').then(payload => {
      const { point } = payload as {
        point: { pageNo: number; x: number; y: number }
      }
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x, point.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      cy.wrap({
        clickedIndex: cursor!.index,
        clickedPageNo: cursor!.pageNo
      }).as('laterSecondCellClickedState')
    })

    cy.get('.ce-inputarea').type('{uparrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@laterSecondCellClickedState').then(clickedPayload => {
        const { clickedIndex, clickedPageNo } = clickedPayload as {
          clickedIndex: number
          clickedPageNo: number
        }
        const cursor = editor.command.getCursorPosition()
        const context = (editor as any).draw.getPosition().getPositionContext()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.be.lessThan(clickedPageNo)
        expect(cursor!.index).to.be.lessThan(clickedIndex)
        expect(context.isTable).to.eq(true)
        expect(context.tdIndex).to.eq(1)
      })
    })
  })

  it('renders table tool on the active paged fragment page', () => {
    const seed = '0123456789'.repeat(1200)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTwoColTable(editor, seed, seed)
      const point = findLaterPagePoint(editor, tableId, 1, seed.length)
      expect(point).to.not.eq(null)
      cy.wrap({ point: point! }).as('laterSecondCellTool')
    })

    cy.get('@laterSecondCellTool').then(payload => {
      const { point } = payload as {
        point: { pageNo: number; x: number; y: number }
      }
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x, point.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@laterSecondCellTool').then(payload => {
        const { point } = payload as {
          point: { pageNo: number }
        }
        const draw = (editor as any).draw
        expect((draw.getTableTool() as any).currentPageNo).to.eq(point.pageNo)
      })
    })
  })

  it('moves down from a later-page first-row cell into the next row cell on the same later page', () => {
    const topSeed = '0123456789'.repeat(900)
    const bottomSeed = 'ABCDEFGHIJ'.repeat(80)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTwoRowTable(editor, topSeed, bottomSeed)
      const topPoint = findLaterPageLastLinePointByCell(
        editor,
        tableId,
        0,
        0,
        topSeed.length,
        5
      )
      expect(topPoint).to.not.eq(null)
      cy.wrap({ tableId, topPoint: topPoint! }).as('laterFirstRowDown')
    })

    cy.get('@laterFirstRowDown').then(payload => {
      const { topPoint } = payload as {
        topPoint: { pageNo: number; x: number; y: number }
      }
      cy.get(`canvas[data-index="${topPoint.pageNo}"]`)
        .scrollIntoView()
        .click(topPoint.x, topPoint.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      const context = (editor as any).draw.getPosition().getPositionContext()
      expect(cursor).to.not.eq(null)
      expect(context.isTable).to.eq(true)
      expect(context.trIndex).to.eq(0)
      expect(context.tdIndex).to.eq(0)
      cy.wrap({
        startPageNo: cursor!.pageNo,
        startIndex: cursor!.index
      }).as('laterFirstRowDownState')
    })

    cy.get('.ce-inputarea').type('{downarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@laterFirstRowDownState').then(statePayload => {
        const { startPageNo, startIndex } = statePayload as {
          startPageNo: number
          startIndex: number
        }
        const cursor = editor.command.getCursorPosition()
        const context = (editor as any).draw.getPosition().getPositionContext()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.be.greaterThan(0)
        expect(cursor!.pageNo).to.be.at.least(startPageNo)
        expect(cursor!.index).to.not.eq(startIndex)
        expect(context.isTable).to.eq(true)
        expect(context.trIndex).to.eq(1)
        expect(context.tdIndex).to.eq(0)
      })
    })
  })

})
