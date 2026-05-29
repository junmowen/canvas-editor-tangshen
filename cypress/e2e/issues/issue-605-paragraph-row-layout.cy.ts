import type Editor from '../../../src/editor'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getOriginalMainElementList()
}

function getTextElements(editor: Editor) {
  return getOriginalElements(editor).filter(
    (element: any) => !element.type && element.value !== '\u200B'
  )
}

function getWrappedContentRows(editor: Editor) {
  return (editor as any).draw
    .getOriginalRowList()
    .filter((row: any) =>
      row.elementList.some((element: any) => element.value !== '\u200B')
    )
}

describe('issue #605 paragraph row layout settings', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('applies row alignment and spacing to the whole paragraph from a wrapped row cursor', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value:
              '段落行布局应该按整个段落生效，即使光标停在自动换行后的第二视觉行。'.repeat(
                10
              )
          }
        ]
      })

      const rows = getWrappedContentRows(editor)
      expect(rows.length).to.be.greaterThan(1)

      const secondRowText = rows[1].elementList.find(
        (element: any) => !element.type && element.value !== '\u200B'
      )
      expect(secondRowText).to.not.eq(undefined)
      const cursorIndex = rows[1].startIndex
      expect(cursorIndex).to.be.greaterThan(0)

      editor.command.executeSetRange(cursorIndex, cursorIndex)
      editor.command.executeRowFlex(RowFlex.RIGHT)
      editor.command.executeRowMargin(1.75)

      const textElements = getTextElements(editor)
      expect(textElements.length).to.be.greaterThan(1)
      textElements.forEach((element: any) => {
        expect(element.rowFlex).to.eq(RowFlex.RIGHT)
        expect(element.rowMargin).to.eq(1.75)
      })

      const value = editor.command.getValue().data.main
      expect(value[0].rowFlex).to.eq(RowFlex.RIGHT)
      expect(value[0].rowMargin).to.eq(1.75)
    })
  })
})
