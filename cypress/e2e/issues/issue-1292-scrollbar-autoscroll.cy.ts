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

describe('issue #1292 scrollbar autoscroll', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('scrolls the editor to keep the caret visible after inserting a newline', () => {
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
      const elementList = draw.getOriginalMainElementList()
      const lastIndex = elementList.length - 1

      editor.command.executeSetRange(lastIndex, lastIndex)
      draw.setCursor(lastIndex)
      scrollContainer.scrollTop = 0
      const beforeCursorRect = draw.getCursor().getCursorDom().getBoundingClientRect()
      cy.wrap({
        beforeCursorRect: {
          top: beforeCursorRect.top,
          bottom: beforeCursorRect.bottom
        }
      }).as('scrollState')
    })

    cy.get('.ce-inputarea').type('{enter}', { force: true, delay: 0 })
    cy.wait(80)

      cy.get('@scrollState').then(payload => {
      const {} = payload as {
        beforeCursorRect: { top: number; bottom: number }
      }
      cy.getEditor().then((editor: Editor) => {
        const cursorRect = (editor as any).draw
          .getCursor()
          .getCursorDom()
          .getBoundingClientRect()

        expect(
          cursorRect.bottom,
          'caret should stay near the viewport after newline input'
        ).to.be.lessThan(1000)
      })
    })
  })
})
