import type Editor from '../../../src/editor'
import { findScrollContainer } from '../../../src/editor/utils'

function buildLongDocument(lineCount: number) {
  const main: any[] = []
  for (let index = 0; index < lineCount; index++) {
    main.push({ value: `line ${String(index + 1).padStart(2, '0')}` })
    if (index < lineCount - 1) {
      main.push({ value: '\n' })
    }
  }
  return main
}

describe('issue #1090 executeSetRange visibility', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('scrolls a focused editor to keep an executeSetRange selection visible', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(320, 260)
      editor.command.executeSetPaperMargin([24, 24, 24, 24])
      editor.command.executeSetValue(
        {
          main: buildLongDocument(120)
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const scrollContainer = findScrollContainer(
        draw.getPageCanvasHost().getContainer()
      )
      const elementList = draw.getObjectResolver().getOriginalMainElementList()
      const lastIndex = elementList.length - 1

      editor.command.executeFocus({
        range: {
          startIndex: 0,
          endIndex: 0
        },
        isMoveCursorToVisible: false
      })
      scrollContainer.scrollTop = 0

      editor.command.executeSetRange(lastIndex, lastIndex)

      const cursorRect = draw.getCursor().getCursorDom().getBoundingClientRect()
      cy.window().then(win => {
        expect(cursorRect.bottom).to.be.lessThan(win.innerHeight)
      })
      expect(editor.command.getRange()).to.deep.include({
        startIndex: lastIndex,
        endIndex: lastIndex
      })
    })
  })
})
