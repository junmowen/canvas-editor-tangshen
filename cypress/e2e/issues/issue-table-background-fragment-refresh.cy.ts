import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('table background fragment refresh', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('refreshes paged table fragments after changing cell background color', () => {
    cy.getEditor().then((editor: Editor) => {
      // 构造一个必然分页的单列表格，用于复现 fragment 深拷贝后的样式刷新问题。
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([10, 10, 10, 10])
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 160 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: 'table background fragment refresh '.repeat(80)
                        .split('')
                        .map(value => ({ value }))
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const table = editor.command
        .getValue({ extraPickAttrs: ['id'] })
        .data.main.find(element => element.type === ElementType.TABLE)
      expect(table?.id).to.be.a('string')
      // 模拟用户选中第一个单元格后设置背景色，命令会修改原始表格数据。
      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table!.id,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0, table!.id, 0, 0, 0, 0)
      editor.command.executeTableTdBackgroundColor('#FFEEAA')

      // 断言分页渲染使用的 fragment 也同步了背景色，避免画布继续读取旧深拷贝。
      const draw = (editor as any).draw
      const fragmentList = draw
        .getPageRowList()
        .flat()
        .map((row: any) => row.tableFragment)
        .filter(Boolean)
      expect(fragmentList.length, '分页表格应生成 fragment').to.be.greaterThan(0)
      expect(
        fragmentList.some((fragment: any) =>
          fragment.trList?.some((tr: any) =>
            tr.tdList?.some((td: any) => td.backgroundColor === '#FFEEAA')
          )
        ),
        'fragment 单元格背景色应随原始表格刷新'
      ).to.eq(true)
    })
  })
})
