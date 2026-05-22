import type Editor from '../../../src/editor'
import { EditorMode } from '../../../src/editor/dataset/enum/Editor'

describe('issue 1406 group id in form mode', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('adds group ids to selected main text in form mode', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'comment target' }]
      })
      editor.command.executeMode(EditorMode.FORM)
      editor.command.executeSetRange(0, 7)

      expect((editor as any).draw.getMode()).to.eq(EditorMode.FORM)
      expect((editor as any).draw.getZone().getZone()).to.eq('main')
      const groupId = editor.command.executeSetGroup()

      expect(groupId).to.be.a('string').and.not.eq('')
      const groupedText = editor.command
        .getValue()
        .data.main.filter(element => element.groupIds?.includes(groupId!))
        .map(element => element.value)
        .join('')
      expect(groupedText).to.eq('comment')
    })
  })
})
