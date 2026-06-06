import Editor from '../../../src/editor'

const ZERO = '\u200B'

type ClickPoint = {
  pageNo: number
  x: number
  y: number
}

type PlainLineStartPoint = ClickPoint & {
  boundaryIndex: number
  headX: number
}

type TableLineStartPoint = ClickPoint & {
  headX: number
  headValue?: string
}

function prepareDocument(editor: Editor) {
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: ZERO }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(360, 640)
  editor.command.executeSetPaperMargin([40, 40, 40, 40])
  editor.command.executeInsertTable(1, 1)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  if (!table?.id) throw new Error('table not found')

  const tableText = 'CELL'
  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: table.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    tableText.split('').map(value => ({
      value
    }))
  )

  const draw = (editor as any).draw
  const tableIndex = draw
    .getOriginalElementList()
    .findIndex((element: any) => element.type === 'table' && element.id === table.id)
  if (!~tableIndex) throw new Error('table index not found')

  const text = 'abcdefghijklmnopqrstuvwxyz '.repeat(16)
  editor.command.executeAppendElementList(
    text.split('').map(value => ({
      value
    }))
  )

  return {
    tableId: table.id,
    tableIndex,
    tableText
  }
}

function prepareDocumentWithLineBeforeTable(editor: Editor) {
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: ZERO }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(360, 640)
  editor.command.executeSetPaperMargin([40, 40, 40, 40])
  editor.command.executeInsertTable(1, 1)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  if (!table?.id) throw new Error('table not found')

  const tableText = 'CELL'
  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: table.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    tableText.split('').map(value => ({
      value
    }))
  )

  editor.command.executeAppendElementList(
    'intro\nABOVE'.split('').map(value => ({
      value
    })),
    {
      isPrepend: true
    } as any
  )

  const draw = (editor as any).draw
  const tableIndex = draw
    .getOriginalElementList()
    .findIndex((element: any) => element.type === 'table' && element.id === table.id)
  if (!~tableIndex) throw new Error('table index not found')

  return {
    tableId: table.id,
    tableIndex,
    tableText
  }
}

function resolveTableFirstTextClick(editor: Editor, tableId: string): ClickPoint {
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
  const draw = (editor as any).draw
  const tablePositionList = draw.getCoordinate().getPositionList()
  const firstTextPosition = tablePositionList.find(
    (position: any) => position.value && position.value !== ZERO
  )
  if (!firstTextPosition) throw new Error('table text position not found')
  return {
    pageNo: firstTextPosition.pageNo,
    x: Math.floor(firstTextPosition.coordinate.leftTop[0] + 1),
    y: Math.floor(firstTextPosition.coordinate.leftTop[1] + 2)
  }
}

function resolvePlainLeftBlankClick(
  editor: Editor,
  tableIndex: number
): PlainLineStartPoint {
  editor.command.executeSetRange(tableIndex, tableIndex)
  const draw = (editor as any).draw
  const elementList = draw.getOriginalElementList()
  const positionList = draw.getCoordinate().getOriginalPositionList()
  const rows = new Map<string, any[]>()

  positionList.forEach((position: any) => {
    const element = elementList[position.index]
    if (!element || element.type === 'table' || element.value === ZERO) return
    if (position.index <= tableIndex) return
    const key = `${position.pageNo}:${position.rowNo}`
    rows.set(key, [...(rows.get(key) || []), position])
  })

  const rowList = [...rows.values()].filter(row => row.length > 2)
  const targetRow = rowList[1] || rowList[0]
  if (!targetRow) {
    throw new Error(
      JSON.stringify({
        message: 'plain text row not found',
        tableIndex,
        elementLength: elementList.length,
        positionLength: positionList.length,
        elements: elementList.map((element: any, index: number) => ({
          index,
          value: element.value,
          type: element.type
        })),
        positions: positionList.map((position: any) => ({
          index: position.index,
          value: position.value,
          rowNo: position.rowNo,
          pageNo: position.pageNo
        }))
      })
    )
  }
  const headPosition = targetRow[0]
  const headPositionListIndex = positionList.indexOf(headPosition)
  const boundaryPosition = positionList[headPositionListIndex - 1]
  if (!boundaryPosition) throw new Error('line start boundary not found')

  return {
    pageNo: headPosition.pageNo,
    x: Math.floor(headPosition.coordinate.leftTop[0] - 4),
    y: Math.floor(
      (headPosition.coordinate.leftTop[1] + headPosition.coordinate.leftBottom[1]) /
        2
    ),
    boundaryIndex: boundaryPosition.index,
    headX: headPosition.coordinate.leftTop[0]
  }
}

function resolvePlainBeforeTableLeftBlankClick(
  editor: Editor,
  tableIndex: number
): PlainLineStartPoint {
  editor.command.executeSetRange(tableIndex, tableIndex)
  const draw = (editor as any).draw
  const elementList = draw.getOriginalElementList()
  const positionList = draw.getCoordinate().getOriginalPositionList()
  const rows = new Map<string, any[]>()

  positionList.forEach((position: any) => {
    const element = elementList[position.index]
    if (!element || element.type === 'table' || element.value === ZERO) return
    if (position.index >= tableIndex) return
    const key = `${position.pageNo}:${position.rowNo}`
    rows.set(key, [...(rows.get(key) || []), position])
  })

  const rowList = [...rows.values()].filter(row => row.length > 2)
  const targetRow = rowList[rowList.length - 1]
  if (!targetRow) {
    throw new Error(
      JSON.stringify({
        message: 'plain text row before table not found',
        tableIndex,
        elementLength: elementList.length,
        positionLength: positionList.length
      })
    )
  }
  const headPosition = targetRow[0]
  const headPositionListIndex = positionList.indexOf(headPosition)
  const boundaryPosition = positionList[headPositionListIndex - 1]
  if (!boundaryPosition) throw new Error('line start boundary not found')

  return {
    pageNo: headPosition.pageNo,
    x: Math.floor(headPosition.coordinate.leftTop[0] - 4),
    y: Math.floor(
      (headPosition.coordinate.leftTop[1] + headPosition.coordinate.leftBottom[1]) /
        2
    ),
    boundaryIndex: boundaryPosition.index,
    headX: headPosition.coordinate.leftTop[0]
  }
}

function getTableCellText(editor: Editor, tableId: string) {
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table' && element.id === tableId)
  return table?.trList?.[0]?.tdList?.[0]?.value?.map(element => element.value).join('')
}

function prepareWrappedTable(editor: Editor) {
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: ZERO }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(360, 640)
  editor.command.executeSetPaperMargin([40, 40, 40, 40])
  editor.command.executeInsertTable(1, 1)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  if (!table?.id) throw new Error('table not found')

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: table.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  const text = 'abcdefghijklmnopqrstuvwxyz'.repeat(20)
  editor.command.executeInsertElementList(
    text.split('').map(value => ({
      value
    }))
  )

  return {
    tableId: table.id,
    text
  }
}

function resolveWrappedTableLineStartClick(
  editor: Editor,
  tableId: string
): TableLineStartPoint {
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

  const draw = (editor as any).draw
  const positionList = draw.getCoordinate().getPositionList()
  const rows = new Map<string, any[]>()
  positionList.forEach((position: any) => {
    if (!position.value || position.value === ZERO) return
    const key = `${position.pageNo}:${position.rowNo}`
    rows.set(key, [...(rows.get(key) || []), position])
  })

  const targetRow = [...rows.values()].find(row => {
    const headPosition = row[0]
    const headPositionListIndex = positionList.indexOf(headPosition)
    const prevPosition = positionList[headPositionListIndex - 1]
    return (
      row.length > 2 &&
      prevPosition &&
      (prevPosition.rowNo !== headPosition.rowNo ||
        prevPosition.pageNo !== headPosition.pageNo)
    )
  })
  if (!targetRow) throw new Error('wrapped table line not found')

  const headPosition = targetRow[0]

  return {
    pageNo: headPosition.pageNo,
    x: Math.floor(headPosition.coordinate.leftTop[0] + 1),
    y: Math.floor(
      (headPosition.coordinate.leftTop[1] + headPosition.coordinate.leftBottom[1]) /
        2
    ),
    headX: headPosition.coordinate.leftTop[0],
    headValue: headPosition.value
  }
}

function resolveWrappedTablePageFirstLineStartClick(
  editor: Editor,
  tableId: string
): TableLineStartPoint {
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

  const draw = (editor as any).draw
  const positionList = draw.getCoordinate().getPositionList()
  const rows = new Map<string, any[]>()
  positionList.forEach((position: any) => {
    if (!position.value || position.value === ZERO) return
    const key = `${position.pageNo}:${position.rowNo}`
    rows.set(key, [...(rows.get(key) || []), position])
  })

  const targetRow = [...rows.values()]
    .filter(row => row.length > 2 && row[0].pageNo > 0)
    .sort((a, b) => a[0].pageNo - b[0].pageNo || a[0].rowNo - b[0].rowNo)[0]
  if (!targetRow) throw new Error('wrapped table page first line not found')

  const headPosition = targetRow[0]
  return {
    pageNo: headPosition.pageNo,
    x: Math.floor(headPosition.coordinate.leftTop[0] + 1),
    y: Math.floor(
      (headPosition.coordinate.leftTop[1] + headPosition.coordinate.leftBottom[1]) /
        2
    ),
    headX: headPosition.coordinate.leftTop[0],
    headValue: headPosition.value
  }
}

describe('left blank click after table click', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('places caret at the current plain text line start after clicking a table cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const documentState = prepareDocument(editor)
      const tableClick = resolveTableFirstTextClick(editor, documentState.tableId)
      const plainClick = resolvePlainLeftBlankClick(editor, documentState.tableIndex)
      cy.wrap({
        ...documentState,
        tableClick,
        plainClick
      }).as('leftBlankState')
    })

    cy.get('@leftBlankState').then(payload => {
      const { tableClick, plainClick } = payload as {
        tableClick: ClickPoint
        plainClick: PlainLineStartPoint
      }
      cy.get(`canvas[data-index="${tableClick.pageNo}"]`).click(
        tableClick.x,
        tableClick.y,
        { force: true }
      )
      cy.get(`canvas[data-index="${plainClick.pageNo}"]`).click(
        plainClick.x,
        plainClick.y,
        { force: true }
      )
    })

    cy.get('@leftBlankState').then(payload => {
      const { plainClick, tableId, tableText } = payload as {
        plainClick: PlainLineStartPoint
        tableId: string
        tableText: string
      }
      cy.getEditor().then((editor: Editor) => {
        const draw = (editor as any).draw
        const cursor = editor.command.getCursorPosition()
        expect(draw.getCoordinate().getPositionContext().isTable).to.eq(false)
        expect(cursor?.index).to.eq(plainClick.boundaryIndex)
        expect(cursor?.coordinate.rightTop[0]).to.eq(plainClick.headX)

        editor.command.executeInsertElementList([{ value: 'X' }])
        const elementList = draw.getOriginalElementList()
        expect(elementList[plainClick.boundaryIndex + 1]?.value).to.eq('X')
        expect(getTableCellText(editor, tableId)).to.eq(tableText)
      })
    })
  })

  it('issue #1348 places caret on the line before a first-line table', () => {
    cy.getEditor().then((editor: Editor) => {
      const documentState = prepareDocumentWithLineBeforeTable(editor)
      const tableClick = resolveTableFirstTextClick(editor, documentState.tableId)
      const plainClick = resolvePlainBeforeTableLeftBlankClick(
        editor,
        documentState.tableIndex
      )
      cy.wrap({
        ...documentState,
        tableClick,
        plainClick
      }).as('beforeTableBlankState')
    })

    cy.get('@beforeTableBlankState').then(payload => {
      const { tableClick, plainClick } = payload as {
        tableClick: ClickPoint
        plainClick: PlainLineStartPoint
      }
      cy.get(`canvas[data-index="${tableClick.pageNo}"]`).click(
        tableClick.x,
        tableClick.y,
        { force: true }
      )
      cy.get(`canvas[data-index="${plainClick.pageNo}"]`).click(
        plainClick.x,
        plainClick.y,
        { force: true }
      )
    })

    cy.get('@beforeTableBlankState').then(payload => {
      const { plainClick, tableId, tableText } = payload as {
        plainClick: PlainLineStartPoint
        tableId: string
        tableText: string
      }
      cy.getEditor().then((editor: Editor) => {
        const draw = (editor as any).draw
        const cursor = editor.command.getCursorPosition()
        expect(draw.getCoordinate().getPositionContext().isTable).to.eq(false)
        expect(cursor?.index).to.eq(plainClick.boundaryIndex)
        expect(cursor?.coordinate.rightTop[0]).to.eq(plainClick.headX)

        editor.command.executeInsertElementList([{ value: 'X' }])
        const elementList = draw.getOriginalElementList()
        expect(elementList[plainClick.boundaryIndex + 1]?.value).to.eq('X')
        expect(getTableCellText(editor, tableId)).to.eq(tableText)
      })
    })
  })

  it('places caret at the current wrapped table line start', () => {
    cy.getEditor().then((editor: Editor) => {
      const tableState = prepareWrappedTable(editor)
      const tableLineStartClick = resolveWrappedTableLineStartClick(
        editor,
        tableState.tableId
      )
      cy.wrap({
        ...tableState,
        tableLineStartClick
      }).as('tableLineStartState')
    })

    cy.get('@tableLineStartState').then(payload => {
      const { tableLineStartClick } = payload as {
        tableLineStartClick: TableLineStartPoint
      }
      cy.get(`canvas[data-index="${tableLineStartClick.pageNo}"]`).click(
        tableLineStartClick.x,
        tableLineStartClick.y,
        { force: true }
      )
    })

    cy.get('@tableLineStartState').then(payload => {
      const { tableLineStartClick, tableId } = payload as {
        tableLineStartClick: TableLineStartPoint
        tableId: string
      }
      cy.getEditor().then((editor: Editor) => {
        const cursor = editor.command.getCursorPosition()
        expect(cursor?.value).to.eq(tableLineStartClick.headValue)
        expect(cursor?.coordinate.rightTop[0]).to.eq(tableLineStartClick.headX)

        const cursorIndex = cursor!.index
        const beforeText = getTableCellText(editor, tableId)
        if (beforeText?.[cursorIndex + 1] !== cursor?.value) {
          const draw = (editor as any).draw
          throw new Error(
            JSON.stringify({
              tableLineStartClick,
              cursor,
              range: editor.command.getRange(),
              rawRange: draw.getRange().getEditBoundaryRange(),
              positionContext: draw.getCoordinate().getPositionContext(),
              aroundText: beforeText?.slice(
                Math.max(0, cursorIndex - 3),
                cursorIndex + 6
              )
            })
          )
        }
        expect(beforeText?.[cursorIndex + 1]).to.eq(cursor?.value)
        editor.command.executeInsertElementList([{ value: 'X' }])
        const text = getTableCellText(editor, tableId)
        expect(text?.[cursorIndex + 1]).to.eq('X')
        expect(text?.[cursorIndex + 2]).to.eq(cursor?.value)
      })
    })
  })

  it('places caret at the first visible table line after page break', () => {
    cy.getEditor().then((editor: Editor) => {
      const tableState = prepareWrappedTable(editor)
      const tableLineStartClick = resolveWrappedTablePageFirstLineStartClick(
        editor,
        tableState.tableId
      )
      cy.wrap({
        ...tableState,
        tableLineStartClick
      }).as('tablePageFirstLineStartState')
    })

    cy.get('@tablePageFirstLineStartState').then(payload => {
      const { tableLineStartClick } = payload as {
        tableLineStartClick: TableLineStartPoint
      }
      cy.get(`canvas[data-index="${tableLineStartClick.pageNo}"]`).click(
        tableLineStartClick.x,
        tableLineStartClick.y,
        { force: true }
      )
    })

    cy.get('@tablePageFirstLineStartState').then(payload => {
      const { tableLineStartClick } = payload as {
        tableLineStartClick: TableLineStartPoint
      }
      cy.getEditor().then((editor: Editor) => {
        const cursor = editor.command.getCursorPosition()
        expect(cursor?.value).to.eq(tableLineStartClick.headValue)
        expect(cursor?.coordinate.rightTop[0]).to.eq(tableLineStartClick.headX)
      })
    })
  })
})
