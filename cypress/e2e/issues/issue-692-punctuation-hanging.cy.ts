import type Editor from '../../../src/editor'
import { WordBreak } from '../../../src/editor/dataset/enum/Editor'

function getContentRows(editor: Editor) {
  return (editor as any).draw
    .getOriginalRowList()
    .filter((row: any) =>
      row.elementList.some((element: any) => element.value !== '\u200B')
    )
}

describe('issue #692 punctuation hanging layout', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('keeps the previous Chinese character on the current row when punctuation hangs at line end', () => {
    cy.getEditor().then((editor: Editor) => {
      const innerWidth = (editor as any).draw.getOriginalInnerWidth()
      const charWidth = Math.floor(innerWidth / 2)
      const punctuationWidth = 20

      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD
      })
      editor.command.executeSetValue({
        main: [
          {
            value: '你',
            width: charWidth
          },
          {
            value: '好',
            width: charWidth
          },
          {
            value: '，',
            width: punctuationWidth
          },
          {
            value: '下',
            width: charWidth
          }
        ]
      })

      const rows = getContentRows(editor)
      expect(rows.length).to.be.greaterThan(1)
      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B你好，'
      )
      expect(rows[0].width).to.eq(charWidth * 2 + punctuationWidth)
      expect(rows[1].elementList.map((element: any) => element.value).join('')).to.eq(
        '下'
      )
    })
  })
})
