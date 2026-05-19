import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function dispatchTab(shiftKey = false) {
  cy.get('.ce-inputarea').then($input => {
    const input = $input[0] as HTMLTextAreaElement
    const KeyboardEventCtor = input.ownerDocument.defaultView!.KeyboardEvent
    const wasNotCancelled = input.dispatchEvent(
      new KeyboardEventCtor('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true
      })
    )
    expect(wasNotCancelled).to.eq(false)
  })
}

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getOriginalMainElementList()
}

describe('tab indentation scenarios', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issues #1190, #942, and #974 insert a styled tab element in normal text when pressing Tab', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: 'before',
          font: 'Microsoft YaHei',
          size: 28,
          bold: true,
          color: '#FF0000',
          strikeout: true
        }
      ])
    })

    dispatchTab()

    cy.getEditor().then((editor: Editor) => {
      const tabElement = getOriginalElements(editor).find(
        (element: any) => element.type === ElementType.TAB
      )

      expect(tabElement).to.not.eq(undefined)
      expect(tabElement.value).to.eq('')
      expect(tabElement.font).to.eq('Microsoft YaHei')
      expect(tabElement.size).to.eq(28)
      expect(tabElement.bold).to.eq(true)
      expect(tabElement.color).to.eq('#FF0000')
      expect(tabElement.strikeout).to.eq(true)
    })
  })
})
