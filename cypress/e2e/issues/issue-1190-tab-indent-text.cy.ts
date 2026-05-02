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

describe('issue #1190 tab indentation scenarios', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('inserts a styled tab element in normal text when pressing Tab', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: 'before',
          bold: true,
          color: '#FF0000'
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
      expect(tabElement.bold).to.eq(true)
      expect(tabElement.color).to.eq('#FF0000')
    })
  })
})
