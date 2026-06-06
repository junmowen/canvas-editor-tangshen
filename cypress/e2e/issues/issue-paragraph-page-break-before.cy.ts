describe('paragraph page break before', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 覆盖 TS-05 段前分页字段，验证分页器会让目标段落从新页开始。 */
  it('starts paragraph on a new page when pageBreakBefore is set', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          { value: '第一页正文' },
          { value: '\n' },
          {
            value: '强制新页段落',
            pageBreakBefore: true
          }
        ]
      })

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const firstPageBlockList = snapshot!.pageList[0].columnList[0].paragraphBlockList
      const secondPageBlockList = snapshot!.pageList[1].columnList[0].paragraphBlockList
      expect(snapshot!.pageCount).to.eq(2)
      expect(firstPageBlockList.length).to.be.greaterThan(0)
      expect(secondPageBlockList.length).to.be.greaterThan(0)
      expect(secondPageBlockList[0].startIndex)
        .to.be.greaterThan(firstPageBlockList[0].startIndex)
    })
  })
})
