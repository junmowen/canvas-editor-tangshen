/** 覆盖 TS-05 段前段后间距，验证 spaceBefore/spaceAfter 参与布局产物。 */
describe('paragraph before and after spacing', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 获取包含指定文本的布局行。 */
  function findRowByText(editor: any, text: string) {
    return editor.draw.getPageRowList()[0].find((row: any) => {
      return row.elementList.some((element: any) => element.value === text)
    })
  }

  /** 段前应形成首行 offsetY，段后应撑开末行高度。 */
  it('applies spaceBefore and spaceAfter to paragraph rows', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          { value: '普通段落' },
          { value: '\n' },
          {
            value: '间距段落',
            spaceBefore: 35,
            spaceAfter: 30
          }
        ]
      })

      const normalRow = findRowByText(editor, '普')
      const spacingRow = findRowByText(editor, '间')

      expect(spacingRow.offsetY).to.be.greaterThan(30)
      expect(spacingRow.height).to.be.greaterThan(normalRow.height)
    })
  })
})
