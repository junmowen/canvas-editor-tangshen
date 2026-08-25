import Editor from '../../../src/editor'

function resetDocument(editor: Editor, text: string) {
  editor.command.executeSetTrackChange({ enabled: false })
  editor.command.executeSelectAll()
  editor.command.executeBackspace()
  editor.command.executeInsertElementList(
    Array.from(text).map(value => ({ value }))
  )
}

describe('track change fast delete', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('does not tunnel Delete through an existing deletion mark', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor, 'abcdef')
      editor.command.executeSetTrackChange({
        enabled: true,
        author: 'tester'
      })
      editor.command.executeSetRange(0, 3)
      editor.command.executeBackspace()
    })

    cy.get('.ce-inputarea')
      .type('{del}', { force: true })
      .then(() => {
        cy.getEditor().then((editor: Editor) => {
          const records = editor.command.getTrackChangeList()
          expect(records).to.have.length(1)
          expect(records[0].type).to.eq('delete')
          expect(records[0].elementList.map(element => element.value).join(''))
            .to.eq('abc')
        })
      })
  })

  it('does not tunnel Backspace through an existing deletion mark', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor, 'abcdef')
      editor.command.executeSetTrackChange({
        enabled: true,
        author: 'tester'
      })
      editor.command.executeSetRange(0, 3)
      editor.command.executeBackspace()
      editor.command.executeSetRange(2, 2)
    })

    cy.get('.ce-inputarea')
      .type('{backspace}', { force: true })
      .then(() => {
        cy.getEditor().then((editor: Editor) => {
          const records = editor.command.getTrackChangeList()
          expect(records).to.have.length(1)
          expect(records[0].type).to.eq('delete')
          expect(records[0].elementList.map(element => element.value).join(''))
            .to.eq('abc')
        })
      })
  })
})
