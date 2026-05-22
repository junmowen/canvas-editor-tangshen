import type Editor from '../../../src/editor'

describe('issue #1063 proxy data initialization', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('accepts proxied editor data during setValue', () => {
    cy.getEditor().then((editor: Editor) => {
      const proxyData = new Proxy(
        {
          main: [{ value: 'proxy-data' }]
        },
        {}
      )

      editor.command.executeSetValue(proxyData as any)

      const value = editor.command.getValue()
      expect(value.data.main[0].value).to.eq('proxy-data')
    })
  })
})
