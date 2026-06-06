import type Editor from '../../../src/editor'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

describe('菜单-标题', () => {
  const url = 'http://localhost:3000/canvas-editor/index.html'

  beforeEach(() => {
    cy.visit(url)

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  const text = 'canvas-editor'
  const level = TitleLevel.FIRST

  it('标题', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: text,
            titleId: 'menu-title-1',
            level
          }
        ]
      })

      const data = editor.command.getValue().data.main
      const titleTree = editor.command.getTitleTree()
      const titleElementList = data.filter(element => element.level === level)

      expect(titleElementList.length).to.be.greaterThan(0)
      expect(
        new Set(titleElementList.map(element => element.titleId)).size
      ).to.eq(1)
      expect(titleTree!.rootList[0].name).to.eq(text)
      expect(titleTree!.rootList[0].level).to.eq(level)
    })
  })
})
