/** 覆盖 TS-03 自定义非等宽分栏，验证行测量不会按第一栏宽度撑破窄栏。 */
describe('typesetting page columns custom widths', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证第二栏比第一栏窄时，行宽仍然按最窄栏约束。 */
  it('measures rows by the narrowest custom column width', () => {
    cy.getEditor().then((editor: any) => {
      const text = '自定义非等宽分栏需要保证窄栏不会被第一栏宽度撑破'.repeat(18)
      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
        margins: [20, 20, 20, 20],
        columns: {
          count: 2,
          gap: 20,
          widths: [220, 120]
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
      editor.command.executeSetValue({
        main: Array.from(text).map(value => ({ value }))
      })

      const columnLayout = editor.draw
        .getServices()
        .pageColumnLayoutService.getPageColumnLayout(0)
      const narrowColumnWidth = columnLayout.columnList[1].rect.width
      const secondColumnRows = editor.draw
        .getPageRowList()
        .flat()
        .filter((row: any) => row.columnIndex === 1)

      expect(secondColumnRows.length).to.be.greaterThan(0)
      const overflowRows = secondColumnRows.filter((row: any) => {
        return row.width > narrowColumnWidth + 1
      })
      expect(
        overflowRows.length,
        JSON.stringify({
          narrowColumnWidth,
          overflowRows: overflowRows.slice(0, 5).map((row: any) => row.width)
        })
      ).to.eq(0)
    })
  })
})
