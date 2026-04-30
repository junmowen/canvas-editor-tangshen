describe('#1399 CONTROL backspace', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas').first().as('canvas').should('have.length', 1)
  })

  it('clears selected text control content with ctrl+a + backspace', () => {
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
        .type('{ctrl}a{backspace}')
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
