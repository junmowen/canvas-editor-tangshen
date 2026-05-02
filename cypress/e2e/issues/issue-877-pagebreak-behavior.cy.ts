import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('issue #877 page break behavior', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('keeps the page break element in data and starts following content on a new page', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: 'before'
        }
      ])
      editor.command.executePageBreak()
      editor.command.executeInsertElementList([
        {
          value: 'after'
        }
      ])

      const data = editor.command.getValue().data.main

      expect(data.map(element => element.value).join('')).to.contain('before')
      expect(data.some(element => element.type === ElementType.PAGE_BREAK)).to.eq(
        true
      )
      expect(data.map(element => element.value).join('')).to.contain('after')
    })

    cy.get('canvas[data-index]').should('have.length', 2)
  })
})
