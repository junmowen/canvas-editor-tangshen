import { ElementType } from '../../../src/editor/dataset/enum/Element'

/** 覆盖 TS-03-A：表格 fragment 在多栏页面内应先进入下一栏，且宽度不能越过栏宽。 */
describe('typesetting page columns table fragment', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 构造一个原始宽度大于栏宽的高表格，用于验证表格栏内测量和跨栏 fragment。 */
  it('keeps table fragments inside column bounds before paginating', () => {
    cy.getEditor().then((editor: any) => {
      const tableId = 'columns-fragment-table'
      const trList = Array.from({ length: 12 }).map((_, rowIndex) => ({
        height: 36,
        tdList: [
          {
            colspan: 1,
            rowspan: 1,
            value: `表格第${rowIndex + 1}行`.split('').map(value => ({ value }))
          }
        ]
      }))

      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
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
          main: [
            {
              id: tableId,
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 240 }],
              trList
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const pageRowList = editor.draw.getPageRowList()
      const firstPageTableRows = pageRowList[0].filter((row: any) => {
        return row.tableFragment ||
          row.elementList.some((element: any) => element.type === ElementType.TABLE)
      })

      expect(firstPageTableRows.length, '第一页必须存在表格 fragment 行').to.be.greaterThan(1)
      expect(
        firstPageTableRows.some((row: any) => row.columnIndex === 1),
        '表格应先进入第二栏，而不是直接分页'
      ).to.eq(true)

      const tableBlockList = snapshot.paragraphBlockList.filter(
        (block: any) => block.type === 'table' && block.tableId === tableId
      )
      expect(tableBlockList.length, '快照必须输出表格段落块').to.be.greaterThan(1)
      expect(
        tableBlockList.some((block: any) => block.columnIndex === 1),
        '表格快照块应保留第二栏归属'
      ).to.eq(true)
      tableBlockList.forEach((block: any) => {
        const column = snapshot.pageList[block.pageNo].columnList[block.columnIndex]
        const columnBlockList = column.paragraphBlockList.filter(
          (columnBlock: any) => columnBlock.id === block.id
        )
        expect(columnBlockList.length, '栏快照必须包含对应表格块').to.eq(1)
        expect(block.rect.width, '表格块宽度不能超过当前栏宽').to.be.lte(
          column.rect.width + 0.5
        )
      })

      firstPageTableRows.forEach((row: any) => {
        const column = snapshot.pageList[row.pageNo || 0].columnList[row.columnIndex || 0]
        expect(row.width, '表格行宽不能超过当前栏宽').to.be.lte(
          column.rect.width + 0.5
        )
        expect(row.tableFragment?.width || row.elementList[0].width, '表格 fragment 宽度不能超过当前栏宽')
          .to.be.lte(column.rect.width + 0.5)
      })
    })
  })
})
