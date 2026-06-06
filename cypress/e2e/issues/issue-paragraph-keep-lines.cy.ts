/** 覆盖 TS-05 keepLines，验证同一段落不会被拆到不同页。 */
describe('paragraph keep lines', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 当前页剩余空间不足以容纳整段时，keepLines 段落应整体移动到下一页。 */
  it('moves the whole paragraph to the next page when it cannot fit', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 260,
        height: 170,
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
      editor.command.executeSetValue({
        main: [
          { value: '填充一' },
          { value: '\n' },
          { value: '填充二' },
          { value: '\n' },
          { value: '填充三' },
          { value: '\n' },
          {
            value: '整段同页内容需要换成多行展示避免被拆开',
            keepLines: true
          }
        ]
      })

      const keepLineRows = editor.draw
        .getPageRowList()
        .flatMap((pageRows: any[], pageNo: number) => {
          return pageRows
            .filter(row => {
              return row.elementList.some((element: any) => element.keepLines)
            })
            .map(row => ({ pageNo, row }))
        })

      expect(keepLineRows.length).to.be.greaterThan(1)
      expect(keepLineRows[0].pageNo).to.eq(1)
      expect(new Set(keepLineRows.map(item => item.pageNo)).size).to.eq(1)
    })
  })
})
