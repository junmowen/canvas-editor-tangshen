import type Editor from '../../../src/editor'
import { WordBreak } from '../../../src/editor/dataset/enum/Editor'

function visitEditor() {
  cy.visit(
    `${Cypress.env('EDITOR_BASE_URL') || 'http://localhost:3000'}/canvas-editor/index.html`
  )
  cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
}

function getContentRows(editor: Editor) {
  return (editor as any).draw
    .getOriginalRowList()
    .filter((row: any) =>
      row.elementList.some((element: any) => element.value !== '\u200B')
    )
}

describe('colon input layout', () => {
  beforeEach(() => {
    visitEditor()
  })

  it('keeps a typed full-width colon on the current row', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '门诊诊断'
          }
        ]
      })
      editor.command.executeSetRange(4, 4)
    })

    cy.get('.ce-inputarea').type('：', { force: true })

    cy.getEditor().then((editor: Editor) => {
      const valueText = editor.command
        .getValue()
        .data.main.map((element: any) => element.value)
        .join('')
      const rows = getContentRows(editor)

      expect(valueText).to.eq('门诊诊断：')
      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B门诊诊断：'
      )
    })
  })

  it('keeps a typed full-width colon with the previous row at a line-end boundary', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD
      })

      const draw = (editor as any).draw
      const innerWidth = draw.getOriginalInnerWidth()
      const charWidth = Math.floor(innerWidth / 2)

      editor.command.executeSetValue({
        main: [
          {
            value: '你',
            width: charWidth
          },
          {
            value: '好',
            width: charWidth
          }
        ]
      })
      editor.command.executeSetRange(2, 2)
      editor.resetRenderBackendStats()

      const sourceCursorPosition = draw.getPosition().getCursorPosition()
      expect(sourceCursorPosition?.rowNo).to.eq(0)
    })

    cy.get('.ce-inputarea').type('：', { force: true })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const rows = getContentRows(editor)
      const cursorPosition = draw.getPosition().getCursorPosition()

      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B你好：'
      )
      expect(cursorPosition?.rowNo).to.eq(0)
    })
  })

  it('keeps the visible cursor aligned with the insertion range during rapid input', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: 'AB'
          }
        ]
      })
      editor.command.executeSetRange(1, 1)
    })

    cy.get('.ce-inputarea').then($input => {
      const input = $input[0] as HTMLTextAreaElement
      input.value = 'x'
      input.dispatchEvent(
        new InputEvent('input', {
          data: 'x',
          inputType: 'insertText',
          bubbles: true
        })
      )
      input.value = 'y'
      input.dispatchEvent(
        new InputEvent('input', {
          data: 'y',
          inputType: 'insertText',
          bubbles: true
        })
      )
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const valueText = editor.command
        .getValue()
        .data.main.map((element: any) => element.value)
        .join('')
      const range = editor.command.getRange()
      const cursorPosition = draw.getPosition().getCursorPosition()

      expect(valueText).to.eq('AxyB')
      expect(range.startIndex).to.eq(3)
      expect(range.endIndex).to.eq(3)
      expect(cursorPosition?.index).to.eq(3)
    })
  })

  it('keeps committed IME text and cursor at the same insertion point', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: 'AB'
          }
        ]
      })
      editor.command.executeSetRange(1, 1)
    })

    cy.get('.ce-inputarea').then($input => {
      const input = $input[0] as HTMLTextAreaElement
      input.dispatchEvent(
        new CompositionEvent('compositionstart', {
          bubbles: true
        })
      )
      ;['e', 'e\'e', 'e\'e\'e', '呃呃呃'].forEach(data => {
        input.value = data
        input.dispatchEvent(
          new InputEvent('input', {
            data,
            inputType: 'insertCompositionText',
            bubbles: true
          })
        )
      })
      input.dispatchEvent(
        new CompositionEvent('compositionend', {
          data: '呃呃呃',
          bubbles: true
        })
      )
      input.value = '呃呃呃'
      input.dispatchEvent(
        new InputEvent('input', {
          data: '呃呃呃',
          inputType: 'insertCompositionText',
          bubbles: true
        })
      )
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const valueText = editor.command
        .getValue()
        .data.main.map((element: any) => element.value)
        .join('')
      const range = editor.command.getRange()
      const cursorPosition = draw.getPosition().getCursorPosition()

      expect(valueText).to.eq('A呃呃呃B')
      expect(range.startIndex).to.eq(4)
      expect(range.endIndex).to.eq(4)
      expect(cursorPosition?.index).to.eq(4)
    })
  })
})
