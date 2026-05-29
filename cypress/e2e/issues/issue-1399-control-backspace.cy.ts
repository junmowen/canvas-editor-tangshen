describe('#1399 CONTROL backspace', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
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

  it('issues #1399 and #1400 delete a selection that contains a whole control', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: 'control',
            value: '',
            control: {
              type: 'text',
              value: [{ value: '控件值' }],
              placeholder: '文本型'
            }
          },
          { value: ' after' }
        ]
      })

      const elementList = editor.draw
        .getObjectResolver()
        .getOriginalMainElementList()
      const controlStart = elementList.findIndex(
        (element: any) => element.controlId
      )
      const controlId = elementList[controlStart].controlId
      const controlEnd = elementList.reduce(
        (endIndex: number, element: any, index: number) =>
          element.controlId === controlId ? index : endIndex,
        controlStart
      )

      expect(controlStart).to.be.greaterThan(-1)
      editor.command.executeSetRange(controlStart - 1, controlEnd)
      editor.command.executeBackspace()

      const value = editor.command
        .getValue()
        .data.main.map((element: any) => element.value)
        .join('')
      expect(value).to.eq('before  after')
      expect(
        editor.command.getValue().data.main.some((element: any) => element.control)
      ).to.eq(false)
    })
  })
})
