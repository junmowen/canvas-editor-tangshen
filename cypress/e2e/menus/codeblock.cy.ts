import Editor from '../../../src/editor'

describe('菜单-代码块', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  const text = `console.log('canvas-editor')`
  const longText = `const veryLongCodeLine = '${'x'.repeat(180)}'`

  it('代码块', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      cy.get('.menu-item__codeblock').click()

      cy.get('.dialog-option [name="codeblock"]').type(text)

      cy.get('.dialog-menu button')
        .eq(1)
        .click()
        .then(() => {
          const data = editor.command.getValue().data.main[2]

          expect(data.value).to.eq('log')

          expect(data.color).to.eq('#b9a40a')
        })
    })
  })

  it('代码块过长自动换行', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        width: 240,
        margins: [40, 40, 40, 40]
      })
      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      cy.get('.menu-item__codeblock').click()

      cy.get('.dialog-option [name="codeblock"]').type(longText)

      cy.get('.dialog-menu button')
        .eq(1)
        .click()
        .then(() => {
          ;(editor as any).draw.flushAsyncInsertTransaction('codeblock-regression')
          editor.command.executeForceUpdate()
          ;(editor as any).draw.flushScheduledFrameRender()
          const rowTexts = (editor as any).draw
            .getOriginalRowList()
            .map((row: any) =>
              row.elementList
                .map((element: any) => element.value)
                .join('')
                .replace(/\u200B/g, '')
            )

          expect(rowTexts.length).to.be.greaterThan(2)
          expect(rowTexts.join('')).to.include('veryLongCodeLine')
        })
    })
  })
})
