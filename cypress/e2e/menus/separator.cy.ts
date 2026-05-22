import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('菜单-分割线', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('分割线', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      cy.get('.menu-item__separator').click()

      cy.get('.menu-item__separator li')
        .eq(1)
        .click()
        .then(() => {
          const data = editor.command.getValue().data.main

          expect(data[0].type).to.eq('separator')

          expect(data[0]?.dashArray?.[0]).to.eq(1)

          expect(data[0]?.dashArray?.[1]).to.eq(1)
        })
    })
  })

  it('preserves a custom separator color through getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: '前缀' },
          {
            type: ElementType.SEPARATOR,
            value: '\n',
            color: '#ffffff',
            dashArray: [1, 1]
          },
          { value: '后缀' }
        ]
      })

      const data = editor.command.getValue().data.main
      const separator = data.find(element => element.type === ElementType.SEPARATOR)
      expect(separator).to.include({
        type: ElementType.SEPARATOR,
        color: '#ffffff'
      })
      expect(separator?.dashArray).to.deep.eq([1, 1])
      expect(editor.command.getText().main.replace(/\u200B/g, '')).to.contain(
        '前缀'
      )
      expect(editor.command.getText().main.replace(/\u200B/g, '')).to.contain(
        '后缀'
      )
    })
  })
})
