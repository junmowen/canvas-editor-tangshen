/** 覆盖 TS-05 行距能力，验证 exact/multiple 会参与真实行高计算。 */
describe('paragraph line spacing', () => {
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

  /** 精确行距应把行盒高度撑到指定值。 */
  it('uses exact line spacing for row height', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          { value: '普通行' },
          { value: '\n' },
          {
            value: '精确行',
            lineSpacingType: 'exact',
            lineSpacing: 60
          }
        ]
      })

      const normalRow = findRowByText(editor, '普')
      const exactRow = findRowByText(editor, '精')

      expect(exactRow.height).to.be.greaterThan(normalRow.height)
      expect(exactRow.height).to.be.greaterThan(60)
    })
  })

  /** 倍数行距应按基础内容高度放大行盒。 */
  it('uses multiple line spacing for row height', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          { value: '普通行' },
          { value: '\n' },
          {
            value: '倍数行',
            lineSpacingType: 'multiple',
            lineSpacing: 2
          }
        ]
      })

      const normalRow = findRowByText(editor, '普')
      const multipleRow = findRowByText(editor, '倍')

      expect(multipleRow.height).to.be.greaterThan(normalRow.height)
      expect(multipleRow.ascent).to.be.greaterThan(normalRow.ascent)
    })
  })
})
