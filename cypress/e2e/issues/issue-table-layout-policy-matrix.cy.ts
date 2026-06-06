import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { TableBorder, TableDisplay, TdBorder } from '../../../src/editor/dataset/enum/table/Table'
import { IElement } from '../../../src/editor/interface/Element'
import { IRow } from '../../../src/editor/interface/Row'
import { ITd } from '../../../src/editor/interface/table/Td'
import { ITableFragmentRow } from '../../../src/editor/interface/table/TableFragment'
import { getTableCellContentInset } from '../../../src/editor/core/modules/table/layout/TableCellContentInset'
import { shouldFragmentTableRow } from '../../../src/editor/core/modules/table/layout/TableRowLayoutPolicy'
import { TableFragmentSplitter } from '../../../src/editor/core/modules/table/layout/engine/TableFragmentSplitter'

function table(overrides: Partial<IElement> = {}): IElement {
  return {
    type: ElementType.TABLE,
    value: '',
    ...overrides
  } as IElement
}

function td(overrides: Partial<ITd> = {}): ITd {
  return {
    colspan: 1,
    rowspan: 1,
    value: [],
    rowIndex: 0,
    colIndex: 0,
    isLastRowTd: false,
    isLastColTd: false,
    ...overrides
  }
}

function row(elementList: IElement[], height = 20): IRow {
  return {
    width: 200,
    height,
    ascent: 10,
    startIndex: 0,
    elementList: elementList.map(element => ({
      ...element,
      metrics: {
        width: 10,
        height: 10,
        boundingBoxAscent: 8,
        boundingBoxDescent: 2
      },
      style: ''
    })),
    rowIndex: 0
  }
}

function textRow(value: string, height = 10): IRow {
  return row([{ value } as IElement], height)
}

function fragmentCell(
  id: string,
  overrides: Partial<ITd> = {}
): ITd {
  const rowList = overrides.rowList || []
  return td({
    id,
    value: rowList.map(item => item.elementList).flat(),
    rowList,
    mainHeight: rowList.reduce((pre, cur) => pre + cur.height, 0),
    ...overrides
  })
}

function fragmentRow(
  id: string,
  height: number,
  tdList: ITd[],
  overrides: Partial<ITableFragmentRow> = {}
): ITableFragmentRow {
  return {
    id,
    height,
    tdList: tdList as ITableFragmentRow['tdList'],
    ...overrides
  }
}

function splitTable(
  sourceTable: IElement,
  overrides: Partial<Parameters<TableFragmentSplitter['split']>[0]> = {}
) {
  const splitter = new TableFragmentSplitter({
    getOptions: () => ({
      scale: 1,
      table: {
        tdPadding: [0, 0, 0, 0],
        defaultTrMinHeight: 10
      }
    }),
    getTableParticle: () => ({
      computeRowColInfo: () => undefined
    })
  } as any)

  return splitter.split({
    sourceTable,
    logicalTableId: sourceTable.id || 'logical-table',
    logicalTableIndex: 3,
    availableHeight: 60,
    pageContentHeight: 100,
    rowMargin: 0,
    ...overrides
  })
}

function fragmentTable(
  trList: ITableFragmentRow[],
  overrides: Partial<IElement> = {}
): IElement {
  return table({
    id: 'logical-table',
    width: 200,
    height: trList.reduce((pre, cur) => pre + cur.height, 0),
    colgroup: [{ width: 200 }],
    trList,
    ...overrides
  })
}

describe('table layout policy matrix', () => {
  it('computes cell content inset by table border scope', () => {
    const cases: Array<{
      name: string
      table: Partial<IElement>
      td: Partial<ITd>
      inset: ReturnType<typeof getTableCellContentInset>
    }> = [
      {
        name: 'defaults to all borders with one-pixel lines consuming no inset',
        table: {},
        td: {},
        inset: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      {
        name: 'all borders use table border width on every side',
        table: { borderType: TableBorder.ALL, borderWidth: 4 },
        td: {},
        inset: { top: 3, right: 3, bottom: 3, left: 3 }
      },
      {
        name: 'dash borders use table border width on every side',
        table: { borderType: TableBorder.DASH, borderWidth: 3 },
        td: {},
        inset: { top: 2, right: 2, bottom: 2, left: 2 }
      },
      {
        name: 'empty borders leave content inset at zero',
        table: { borderType: TableBorder.EMPTY, borderWidth: 6 },
        td: {},
        inset: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      {
        name: 'external borders apply only to outer table edges',
        table: {
          borderType: TableBorder.EXTERNAL,
          borderWidth: 2,
          borderExternalWidth: 5
        },
        td: {
          rowIndex: 0,
          colIndex: 0,
          isLastRowTd: true,
          isLastColTd: true
        },
        inset: { top: 4, right: 4, bottom: 4, left: 4 }
      },
      {
        name: 'external borders do not inset inner cells',
        table: {
          borderType: TableBorder.EXTERNAL,
          borderExternalWidth: 5
        },
        td: {
          rowIndex: 1,
          colIndex: 1,
          isLastRowTd: false,
          isLastColTd: false
        },
        inset: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      {
        name: 'internal borders apply only to inner table edges',
        table: { borderType: TableBorder.INTERNAL, borderWidth: 4 },
        td: {
          rowIndex: 1,
          colIndex: 1,
          isLastRowTd: false,
          isLastColTd: false
        },
        inset: { top: 3, right: 3, bottom: 3, left: 3 }
      },
      {
        name: 'internal borders do not inset outer table edges',
        table: { borderType: TableBorder.INTERNAL, borderWidth: 4 },
        td: {
          rowIndex: 0,
          colIndex: 0,
          isLastRowTd: true,
          isLastColTd: true
        },
        inset: { top: 0, right: 0, bottom: 0, left: 0 }
      }
    ]

    cases.forEach(testCase => {
      expect(
        getTableCellContentInset(table(testCase.table), td(testCase.td)),
        testCase.name
      ).to.deep.eq(testCase.inset)
    })
  })

  it('lets explicit cell borders raise but not lower the table-derived inset', () => {
    expect(
      getTableCellContentInset(
        table({ borderType: TableBorder.EMPTY, borderWidth: 1 }),
        td({
          borderWidth: 4,
          borderTypes: [TdBorder.TOP, TdBorder.RIGHT, TdBorder.BOTTOM, TdBorder.LEFT]
        })
      ),
      'cell borders create inset when table border scope is empty'
    ).to.deep.eq({ top: 3, right: 3, bottom: 3, left: 3 })

    expect(
      getTableCellContentInset(
        table({ borderType: TableBorder.ALL, borderWidth: 6 }),
        td({
          borderWidth: 2,
          borderTypes: [TdBorder.TOP, TdBorder.LEFT]
        })
      ),
      'narrower cell borders do not reduce table-derived inset'
    ).to.deep.eq({ top: 5, right: 5, bottom: 5, left: 5 })

    expect(
      getTableCellContentInset(
        table({ borderType: TableBorder.INTERNAL, borderWidth: 2 }),
        td({
          rowIndex: 0,
          colIndex: 0,
          isLastRowTd: true,
          isLastColTd: true,
          borderWidth: 5,
          borderTypes: [TdBorder.RIGHT, TdBorder.BOTTOM]
        })
      ),
      'cell borders can add inset to outer edges ignored by internal table borders'
    ).to.deep.eq({ top: 0, right: 4, bottom: 4, left: 0 })
  })

  it('fragments only single table rows or overflowing rows with inline tables', () => {
    const inlineTable = table({ tableDisplay: TableDisplay.INLINE })
    const blockTable = table()
    const text = { value: 'text' } as IElement
    const payload = {
      rowOffsetY: 10,
      pageHeight: 100,
      pageLimitHeight: 150
    }

    expect(
      shouldFragmentTableRow({
        row: row([blockTable], 10),
        ...payload
      }),
      'single block table row fragments even when it fits'
    ).to.eq(true)

    expect(
      shouldFragmentTableRow({
        row: row([inlineTable], 10),
        ...payload
      }),
      'single inline table row still follows the single-table row rule'
    ).to.eq(true)

    expect(
      shouldFragmentTableRow({
        row: row([text, inlineTable], 40),
        ...payload
      }),
      'mixed inline table row does not fragment at the exact page limit'
    ).to.eq(false)

    expect(
      shouldFragmentTableRow({
        row: row([text, inlineTable], 41),
        ...payload
      }),
      'mixed inline table row fragments only after crossing the page limit'
    ).to.eq(true)

    expect(
      shouldFragmentTableRow({
        row: row([text, blockTable], 200),
        ...payload
      }),
      'mixed block table row does not use inline overflow fragmentation'
    ).to.eq(false)

    expect(
      shouldFragmentTableRow({
        row: row([text], 200),
        ...payload
      }),
      'plain overflowing row does not enter table fragmentation'
    ).to.eq(false)
  })

  it('repeats page-start header rows in later table fragments with origin metadata', () => {
    const headerCell = fragmentCell('header-cell', {
      rowIndex: 0,
      colIndex: 0,
      rowList: [textRow('H')]
    })
    const bodyCell = fragmentCell('body-cell', {
      rowIndex: 1,
      colIndex: 0,
      rowList: [textRow('B')]
    })
    const tailCell = fragmentCell('tail-cell', {
      rowIndex: 2,
      colIndex: 0,
      rowList: [textRow('T')]
    })
    const sourceTable = fragmentTable([
      fragmentRow('header-row', 20, [headerCell], { repeatOnPageStart: true }),
      fragmentRow('body-row', 40, [bodyCell]),
      fragmentRow('tail-row', 40, [tailCell])
    ])

    const result = splitTable(sourceTable, {
      availableHeight: 65,
      pageContentHeight: 100
    })

    expect(result.startOnNewPage).to.eq(false)
    expect(result.fragments).to.have.length(2)

    const repeatedHeader = result.fragments[1].trList![0]
    expect(repeatedHeader.id).to.not.eq('header-row')
    expect(repeatedHeader.originId).to.eq('header-row')
    expect(repeatedHeader.repeatOnPageStart).to.eq(true)
    expect(repeatedHeader.tdList[0].id).to.eq('header-cell')
    expect(repeatedHeader.tdList[0].originId).to.eq('header-cell')
    expect(repeatedHeader.tdList[0].cellOriginTrId).to.eq('header-row')
    expect(result.fragments[1].trList![1].originId).to.eq('tail-row')
  })

  it('copies repeatOnPageStart header rows into the tail fragment without losing origin or dimensions', () => {
    const headerRows = [textRow('H', 12)]
    const sourceHeaderCell = fragmentCell('header-cell-instance', {
      originId: 'header-cell-origin',
      cellOriginTrId: 'header-row-origin',
      rowIndex: 0,
      colIndex: 0,
      width: 240,
      height: 24,
      realHeight: 24,
      mainHeight: 12,
      rowList: headerRows
    })
    const sourceHeaderRow = fragmentRow(
      'header-row-instance',
      24,
      [sourceHeaderCell],
      {
        originId: 'header-row-origin',
        originHeight: 24,
        repeatOnPageStart: true
      }
    )
    const sourceTable = fragmentTable(
      [
        sourceHeaderRow,
        fragmentRow('body-row', 36, [
          fragmentCell('body-cell', {
            rowIndex: 1,
            colIndex: 0,
            width: 240,
            height: 36,
            realHeight: 36,
            rowList: [textRow('B')]
          })
        ]),
        fragmentRow('tail-row', 44, [
          fragmentCell('tail-cell', {
            rowIndex: 2,
            colIndex: 0,
            width: 240,
            height: 44,
            realHeight: 44,
            rowList: [textRow('T')]
          })
        ])
      ],
      {
        width: 240,
        height: 104,
        colgroup: [{ width: 80 }, { width: 160 }]
      }
    )

    const result = splitTable(sourceTable, {
      availableHeight: 69,
      pageContentHeight: 100
    })

    expect(result.fragments).to.have.length(2)

    const tailFragment = result.fragments[1]
    const repeatedHeader = tailFragment.trList![0]
    const repeatedHeaderCell = repeatedHeader.tdList[0]

    expect(tailFragment.width).to.eq(240)
    expect(tailFragment.height).to.eq(68)
    expect(tailFragment.colgroup).to.deep.eq([{ width: 80 }, { width: 160 }])

    expect(repeatedHeader).to.not.eq(sourceHeaderRow)
    expect(repeatedHeader.id).to.not.eq('header-row-instance')
    expect(repeatedHeader.originId).to.eq('header-row-origin')
    expect(repeatedHeader.originHeight).to.eq(24)
    expect(repeatedHeader.height).to.eq(24)
    expect(repeatedHeader.repeatOnPageStart).to.eq(true)

    expect(repeatedHeaderCell).to.not.eq(sourceHeaderCell)
    expect(repeatedHeaderCell.originId).to.eq('header-cell-origin')
    expect(repeatedHeaderCell.cellOriginTrId).to.eq('header-row-origin')
    expect(repeatedHeaderCell.width).to.eq(240)
    expect(repeatedHeaderCell.height).to.eq(24)
    expect(repeatedHeaderCell.realHeight).to.eq(24)
    expect(repeatedHeaderCell.mainHeight).to.eq(12)
    expect(repeatedHeaderCell.rowList).to.not.eq(headerRows)
    expect(repeatedHeaderCell.value.map(element => element.value)).to.deep.eq(['H'])
  })

  it('decorates every fragment with logical table and source row/cell origin metadata', () => {
    const sourceTable = fragmentTable(
      [
        fragmentRow('row-0', 30, [
          fragmentCell('cell-0', {
            rowIndex: 0,
            colIndex: 0,
            rowList: [textRow('A')]
          })
        ]),
        fragmentRow('row-1', 30, [
          fragmentCell('cell-1', {
            rowIndex: 1,
            colIndex: 0,
            rowList: [textRow('B')]
          })
        ])
      ],
      { id: 'table-origin' }
    )

    const result = splitTable(sourceTable, {
      logicalTableId: 'table-origin',
      logicalTableIndex: 9,
      availableHeight: 35,
      pageContentHeight: 100
    })

    expect(result.fragments).to.have.length(2)
    result.fragments.forEach((fragment, fragmentOrder) => {
      expect(fragment.logicalTableId).to.eq('table-origin')
      expect(fragment.logicalTableIndex).to.eq(9)
      expect(fragment.fragmentOrder).to.eq(fragmentOrder)
      fragment.trList!.forEach(tr => {
        expect(tr.originId).to.match(/^row-/)
        tr.tdList.forEach(cell => {
          expect(cell.originId).to.match(/^cell-/)
          expect(cell.cellOriginTrId).to.eq(tr.originId)
        })
      })
    })
  })

  it('moves a table to the next page when the current page cannot fit the first row minimum', () => {
    const sourceTable = fragmentTable([
      fragmentRow('row-0', 50, [
        fragmentCell('cell-0', {
          rowIndex: 0,
          colIndex: 0,
          rowList: [textRow('A')]
        })
      ])
    ])

    const result = splitTable(sourceTable, {
      availableHeight: 9,
      pageContentHeight: 100
    })

    expect(result.startOnNewPage).to.eq(true)
    expect(result.fragments).to.have.length(1)
    expect(result.fragments[0].trList![0].originId).to.eq('row-0')
  })

  it('keeps a first-row fragment on the current page once its minimum height fits', () => {
    const sourceTable = fragmentTable([
      fragmentRow('row-0', 50, [
        fragmentCell('cell-0', {
          rowIndex: 0,
          colIndex: 0,
          rowList: [textRow('A', 10), textRow('B', 20), textRow('C', 20)]
        })
      ])
    ])

    const result = splitTable(sourceTable, {
      availableHeight: 10,
      pageContentHeight: 100
    })

    expect(result.startOnNewPage).to.eq(false)
    expect(result.fragments).to.have.length(2)
    expect(result.fragments[0].trList![0].originId).to.eq('row-0')
    expect(result.fragments[0].trList![0].tdList[0].value.map(element => element.value)).to.deep.eq(['A'])
    expect(result.fragments[1].trList![0].tdList[0].value.map(element => element.value)).to.deep.eq(['B', 'C'])
  })

  it('splits before a row when the row minimum cannot fit and no carry cell covers it', () => {
    const sourceTable = fragmentTable([
      fragmentRow('row-0', 30, [
        fragmentCell('cell-0', {
          rowIndex: 0,
          colIndex: 0,
          rowList: [textRow('A')]
        })
      ]),
      fragmentRow('row-1', 30, [
        fragmentCell('cell-1', {
          rowIndex: 1,
          colIndex: 0,
          rowList: [textRow('B', 20), textRow('C', 20)]
        })
      ])
    ])

    const result = splitTable(sourceTable, {
      availableHeight: 35,
      pageContentHeight: 100
    })

    expect(result.fragments).to.have.length(2)
    expect(result.fragments[0].trList!.map(tr => tr.originId)).to.deep.eq(['row-0'])
    expect(result.fragments[1].trList![0].originId).to.eq('row-1')
    expect(result.fragments[1].trList![0].tdList[0].originId).to.eq('cell-1')
    expect(result.fragments[1].trList![0].tdList[0].value.map(element => element.value)).to.deep.eq(['B', 'C'])
  })

  it('allows a covered split row to create carry cells even when its remaining minimum is small', () => {
    const sourceTable = fragmentTable([
      fragmentRow('row-0', 30, [
        fragmentCell('span-cell', {
          rowspan: 2,
          rowIndex: 0,
          colIndex: 0,
          rowList: [textRow('A', 20), textRow('B', 20), textRow('C', 20)]
        })
      ]),
      fragmentRow('row-1', 30, [])
    ])

    const result = splitTable(sourceTable, {
      availableHeight: 35,
      pageContentHeight: 100
    })

    expect(result.fragments).to.have.length(2)
    expect(result.fragments[0].trList!.map(tr => tr.originId)).to.deep.eq(['row-0', 'row-1'])
    expect(result.fragments[0].trList![0].tdList[0].rowspan).to.eq(2)

    const tailCarryRow = result.fragments[1].trList![0]
    const tailCarryCell = tailCarryRow.tdList[0]
    expect(tailCarryRow.originId).to.eq('row-1')
    expect(tailCarryCell.originId).to.eq('span-cell')
    expect(tailCarryCell.cellOriginTrId).to.eq('row-0')
    expect(tailCarryCell.value.map(element => element.value)).to.deep.eq(['B', 'C'])
  })
})
