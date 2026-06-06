import type Editor from '../../../src/editor'

function dispatchKeyboard(key: string, options: KeyboardEventInit = {}) {
  cy.get('.ce-inputarea').then($input => {
    const input = $input[0] as HTMLTextAreaElement
    const KeyboardEventCtor = input.ownerDocument.defaultView!.KeyboardEvent
    input.dispatchEvent(
      new KeyboardEventCtor('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options
      })
    )
  })
}

describe('issue #111 shift selection direction', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('shrinks selection when reversing shift-arrow direction', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        width: 180,
        margins: [40, 40, 40, 40]
      })
      editor.command.executeSetValue({
        main: [
          {
            value:
              'first line wraps enough to create a second line for selection'
          }
        ]
      })

      const positionList = (editor as any).draw.getCoordinate().getPositionList()
      const secondRowPositions = positionList.filter(
        (position: any) => position.rowNo === 1
      )
      expect(secondRowPositions.length).to.be.greaterThan(1)
      const secondRowStartIndex = secondRowPositions[0].index
      editor.command.executeSetRange(secondRowStartIndex, secondRowStartIndex)
      cy.wrap(secondRowStartIndex).as('secondRowStartIndex')
    })

    dispatchKeyboard('ArrowLeft', {
      shiftKey: true
    })

    dispatchKeyboard('ArrowRight', {
      shiftKey: true
    })

    cy.get('@secondRowStartIndex').then(value => {
      const expectedIndex = value as number
      cy.getEditor().then((editor: Editor) => {
        const range = editor.command.getRange()
        expect(range.startIndex).to.eq(expectedIndex)
        expect(range.endIndex).to.eq(expectedIndex)
        expect(editor.command.getRangeContext()?.selectionText || '').to.eq('')
      })
    })
  })
})
