import { ElementType } from '../../../src/editor/dataset/enum/Element'

const TABLE_ID = 'keep-with-next-fragment-table'

function createTable(rowCount = 6) {
  return {
    id: TABLE_ID,
    type: ElementType.TABLE,
    value: '',
    colgroup: [{ width: 120 }],
    trList: Array.from({ length: rowCount }).map((_, rowIndex) => ({
      height: 42,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: `表格第${rowIndex + 1}行`.split('').map(value => ({ value }))
        }
      ]
    }))
  }
}

function createMainValue() {
  return [
    { value: '填充一' },
    { value: '\n' },
    { value: '填充二' },
    { value: '\n' },
    { value: '填充三' },
    { value: '\n' },
    {
      value: '标题',
      keepWithNext: true
    },
    { value: '\n' },
    createTable()
  ]
}

function getPlacedRows(editor: any) {
  return editor.draw
    .getPageRowList()
    .flatMap((rows: any[], pageNo: number) =>
      rows.map(row => ({
        ...row,
        pageNo
      }))
    )
}

function getHeadingRow(placedRows: any[]) {
  return placedRows.find(row =>
    row.elementList.some((element: any) => element.keepWithNext)
  )
}

function getFirstTableFragmentRow(placedRows: any[]) {
  return placedRows.find(row => {
    return (
      row.tableFragment?.logicalTableId === TABLE_ID &&
      row.tableFragment?.fragmentOrder === 0
    )
  })
}

/** 覆盖 TS-05/TS-10：keepWithNext 标题后紧跟块级表格 fragment 时不能孤立在页底/栏底。 */
describe('paragraph keep with next before table fragment', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 标题在当前页底只够自身排入时，应与表格首个 fragment 一起进入下一页。 */
  it('keeps heading and first table fragment on the same page', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 180,
        margins: [20, 20, 20, 20],
        header: {
          disabled: true
        },
        footer: {
          disabled: true
        },
        pageNumber: {
          disabled: true
        }
      })
      editor.command.executeSetValue(
        {
          header: [],
          main: createMainValue(),
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const placedRows = getPlacedRows(editor)
      const headingRow = getHeadingRow(placedRows)
      const firstTableFragmentRow = getFirstTableFragmentRow(placedRows)

      expect(headingRow, '标题行必须存在').to.not.eq(undefined)
      expect(firstTableFragmentRow, '表格首个 fragment 行必须存在').to.not.eq(undefined)
      expect(headingRow.pageNo, '标题应从页底换到下一页').to.eq(1)
      expect(firstTableFragmentRow.pageNo, '首个表格 fragment 应与标题同页').to.eq(
        headingRow.pageNo
      )
    })
  })

  /** 多栏下标题在当前栏底只够自身排入时，应与表格首个 fragment 一起进入下一栏。 */
  it('keeps heading and first table fragment in the same column', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 180,
        margins: [20, 20, 20, 20],
        columns: {
          count: 2,
          gap: 20,
          widths: [160, 160]
        },
        header: {
          disabled: true
        },
        footer: {
          disabled: true
        },
        pageNumber: {
          disabled: true
        }
      })
      editor.command.executeSetValue(
        {
          header: [],
          main: createMainValue(),
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const placedRows = getPlacedRows(editor)
      const headingRow = getHeadingRow(placedRows)
      const firstTableFragmentRow = getFirstTableFragmentRow(placedRows)

      expect(headingRow, '标题行必须存在').to.not.eq(undefined)
      expect(firstTableFragmentRow, '表格首个 fragment 行必须存在').to.not.eq(undefined)
      expect(headingRow.pageNo, '标题应留在第一页的下一栏').to.eq(0)
      expect(headingRow.columnIndex, '标题应从第一栏换到第二栏').to.eq(1)
      expect(firstTableFragmentRow.pageNo, '首个表格 fragment 应与标题同页').to.eq(
        headingRow.pageNo
      )
      expect(
        firstTableFragmentRow.columnIndex,
        '首个表格 fragment 应与标题同栏'
      ).to.eq(headingRow.columnIndex)
    })
  })
})
