import Editor from '../../../src/editor'
import { TextDecorationStyle } from '../../../src/editor/dataset/enum/Text'

describe('菜单-格式刷', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  const text = 'canvas-editor'
  const textLength = text.length

  it('格式刷', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      const sourceStyle = {
        bold: true,
        color: '#FF0000',
        highlight: '#F2F27F',
        font: 'Microsoft YaHei',
        size: 18,
        italic: true,
        underline: true,
        strikeout: true,
        textDecoration: {
          style: TextDecorationStyle.WAVY
        }
      }

      editor.command.executeInsertElementList([
        {
          value: text,
          ...sourceStyle
        }
      ])

      editor.command.executeInsertElementList([
        {
          value: text
        }
      ])

      editor.command.executeSetRange(0, textLength)

      cy.get('.menu-item__painter')
        .click()
        .wait(300)
        .then(() => {
          editor.command.executeSetRange(textLength, 2 * textLength)

          editor.command.executeApplyPainterStyle()

          const data = editor.command.getValue().data.main

          expect(data.length).to.eq(1)

          Object.entries(sourceStyle).forEach(([key, value]) => {
            expect(data[0][key as keyof typeof sourceStyle]).to.deep.eq(value)
          })
        })
    })
  })
})
