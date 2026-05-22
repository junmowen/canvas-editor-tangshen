import type Editor from '../../../src/editor'

describe('issue #1237 page columns', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('updates and persists page column settings from the footer dialog', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        columns: {
          count: 2,
          gap: 32,
          widths: [180, 160]
        }
      })
    })

    cy.get('.page-columns').click()
    cy.get('.dialog-title span').should('contain.text', '分栏')
    cy.get('.dialog-option [name="count"]').should('have.value', '2')
    cy.get('.dialog-option [name="gap"]').should('have.value', '32')
    cy.get('.dialog-option [name="widths"]').should('have.value', '180,160')

    cy.get('.dialog-option [name="count"]').clear().type('3')
    cy.get('.dialog-option [name="gap"]').clear().type('18')
    cy.get('.dialog-option [name="widths"]').clear().type('160,120,100')
    cy.get('.dialog-menu button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().columns).to.deep.eq({
        count: 3,
        gap: 18,
        widths: [160, 120, 100]
      })
      expect(editor.command.getValue().options.columns).to.deep.eq({
        count: 3,
        gap: 18,
        widths: [160, 120, 100]
      })
    })
  })
})
