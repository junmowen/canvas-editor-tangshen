import type Editor from '../../../src/editor'
import { WordBreak } from '../../../src/editor/dataset/enum/Editor'

function getContentRows(editor: Editor) {
  return (editor as any).draw
    .getObjectResolver().getOriginalRowList()
    .filter((row: any) =>
      row.elementList.some((element: any) => element.value !== '\u200B')
    )
}

describe('issue #692 punctuation hanging layout', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
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

  it('keeps numeric unit suffix on the current row when it reaches line end', () => {
    cy.getEditor().then((editor: Editor) => {
      const innerWidth = (editor as any).draw.getOriginalInnerWidth()
      const digitWidth = 10
      const unitWidth = 20

      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD
      })
      editor.command.executeSetValue({
        main: [
          {
            value: '温',
            width: innerWidth - digitWidth * 2
          },
          {
            value: '3',
            width: digitWidth
          },
          {
            value: '0',
            width: digitWidth
          },
          {
            value: '℃',
            width: unitWidth
          },
          {
            value: '下',
            width: digitWidth
          }
        ]
      })

      const rows = getContentRows(editor)
      expect(rows.length).to.be.greaterThan(1)
      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B温30℃'
      )
      expect(rows[0].width).to.eq(innerWidth + unitWidth)
      expect(rows[1].elementList.map((element: any) => element.value).join('')).to.eq(
        '下'
      )
    })
  })

  it('keeps closing punctuation away from the next row start', () => {
    cy.getEditor().then((editor: Editor) => {
      const innerWidth = (editor as any).draw.getOriginalInnerWidth()
      const punctuationWidth = 20
      const nextTextWidth = 10

      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD
      })
      editor.command.executeSetValue({
        main: [
          {
            value: '你',
            width: innerWidth
          },
          {
            value: '）',
            width: punctuationWidth
          },
          {
            value: '下',
            width: nextTextWidth
          }
        ]
      })

      const rows = getContentRows(editor)
      expect(rows.length).to.be.greaterThan(1)
      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B你）'
      )
      expect(rows[0].width).to.eq(innerWidth + punctuationWidth)
      expect(rows[1].elementList.map((element: any) => element.value).join('')).to.eq(
        '下'
      )
    })
  })

  it('supports custom closing punctuation from typography options', () => {
    cy.getEditor().then((editor: Editor) => {
      const innerWidth = (editor as any).draw.getOriginalInnerWidth()
      const punctuationWidth = 20
      const nextTextWidth = 10

      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD,
        typography: {
          closingPunctuationList: ['‧']
        }
      })
      editor.command.executeSetValue({
        main: [
          {
            value: '文',
            width: innerWidth
          },
          {
            value: '‧',
            width: punctuationWidth
          },
          {
            value: '下',
            width: nextTextWidth
          }
        ]
      })

      const rows = getContentRows(editor)
      expect(rows.length).to.be.greaterThan(1)
      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B文‧'
      )
      expect(rows[1].elementList.map((element: any) => element.value).join('')).to.eq(
        '下'
      )
    })
  })

  it('moves opening punctuation to the next row when it would stay at line end', () => {
    cy.getEditor().then((editor: Editor) => {
      const innerWidth = (editor as any).draw.getOriginalInnerWidth()
      const punctuationWidth = 20
      const nextTextWidth = 10

      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD
      })
      editor.command.executeSetValue({
        main: [
          {
            value: '你',
            width: innerWidth - punctuationWidth
          },
          {
            value: '（',
            width: punctuationWidth
          },
          {
            value: '内',
            width: nextTextWidth
          }
        ]
      })

      const rows = getContentRows(editor)
      expect(rows.length).to.be.greaterThan(1)
      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B你'
      )
      expect(rows[1].elementList.map((element: any) => element.value).join('')).to.eq(
        '（内'
      )
    })
  })

  it('supports custom numeric unit suffixes from typography options', () => {
    cy.getEditor().then((editor: Editor) => {
      const innerWidth = (editor as any).draw.getOriginalInnerWidth()
      const digitWidth = 10
      const unitWidth = 20

      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD,
        typography: {
          numberUnitSuffixList: ['瓶']
        }
      })
      editor.command.executeSetValue({
        main: [
          {
            value: '药',
            width: innerWidth - digitWidth * 2
          },
          {
            value: '1',
            width: digitWidth
          },
          {
            value: '2',
            width: digitWidth
          },
          {
            value: '瓶',
            width: unitWidth
          },
          {
            value: '装',
            width: digitWidth
          }
        ]
      })

      const rows = getContentRows(editor)
      expect(rows.length).to.be.greaterThan(1)
      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B药12瓶'
      )
      expect(rows[1].elementList.map((element: any) => element.value).join('')).to.eq(
        '装'
      )
    })
  })

  it('supports custom opening punctuation from typography options', () => {
    cy.getEditor().then((editor: Editor) => {
      const innerWidth = (editor as any).draw.getOriginalInnerWidth()
      const punctuationWidth = 20
      const nextTextWidth = 10

      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD,
        typography: {
          openingPunctuationList: ['‹']
        }
      })
      editor.command.executeSetValue({
        main: [
          {
            value: '你',
            width: innerWidth - punctuationWidth
          },
          {
            value: '‹',
            width: punctuationWidth
          },
          {
            value: '内',
            width: nextTextWidth
          }
        ]
      })

      const rows = getContentRows(editor)
      expect(rows.length).to.be.greaterThan(1)
      expect(rows[0].elementList.map((element: any) => element.value).join('')).to.eq(
        '\u200B你'
      )
      expect(rows[1].elementList.map((element: any) => element.value).join('')).to.eq(
        '‹内'
      )
    })
  })

  it('adds configured spacing between CJK and latin text', () => {
    cy.getEditor().then((editor: Editor) => {
      const charWidth = 10
      const spacing = 4

      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD,
        typography: {
          cjkLatinSpacing: spacing
        }
      })
      editor.command.executeSetValue({
        main: [
          {
            value: 'A',
            width: charWidth
          },
          {
            value: '中',
            width: charWidth
          },
          {
            value: 'B',
            width: charWidth
          }
        ]
      })

      const rows = getContentRows(editor)
      const textRow = rows[0]
      expect(textRow.width).to.eq(charWidth * 3 + spacing * 2)
      expect(
        textRow.elementList.map((element: any) => element.metrics.width)
      ).to.deep.eq([0, charWidth + spacing, charWidth + spacing, charWidth])
    })
  })
})
