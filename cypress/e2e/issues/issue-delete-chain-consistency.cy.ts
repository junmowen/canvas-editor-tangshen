describe('delete chain consistency', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas').first().as('canvas').should('have.length', 1)
  })

  it('keeps text control content empty after ctrl+a + delete', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      editor.command.executeInsertElementList([
        {
          type: 'control',
          value: '',
          control: {
            type: 'text',
            value: null,
            placeholder: '文本型'
          }
        }
      ])

      cy.get('@canvas').type('{leftArrow}')
      cy.get('.ce-inputarea')
        .type('canvas-editor')
        .type('{ctrl}a{del}')
        .then(() => {
          const main = editor.command.getValue().data.main
          if (!main.length) {
            expect(main).to.have.length(0)
            return
          }
          const value =
            main[0].control?.value?.map((element: any) => element.value).join('') || ''
          expect(value).to.eq('')
        })
    })
  })
})
