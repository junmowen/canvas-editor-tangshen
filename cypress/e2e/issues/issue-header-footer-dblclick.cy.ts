import Editor from '../../../src/editor'
import { EditorZone } from '../../../src/editor/dataset/enum/Editor'

describe('header and footer double click editing', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  function prepareHeaderFooter(editor: Editor) {
    editor.command.executeSetValue({
      header: [{ value: 'header' }],
      main: [{ value: 'main' }],
      footer: [{ value: 'footer' }]
    })
    ;(editor as any).draw.flushScheduledFrameRender()
    const draw = (editor as any).draw
    const scale = editor.command.getOptions().scale
    const x = draw.getMargins()[3] + 30 * scale
    return {
      x,
      headerY: draw.getHeader().getHeaderTop() + draw.getHeader().getHeight() / 2,
      footerY:
        draw.getHeight() -
        draw.getFooter().getFooterBottom() -
        draw.getFooter().getHeight() / 2
    }
  }

  it('enters header and footer zones on double click', () => {
    cy.getEditor().then((editor: Editor) => {
      const points = prepareHeaderFooter(editor)
      cy.wrap(points).as('framePoints')
    })

    cy.get('@framePoints').then(payload => {
      const { x, headerY } = payload as { x: number; headerY: number }
      cy.get('canvas[data-index="0"]').dblclick(x, headerY, { force: true })
    })

    cy.getEditor().then((editor: Editor) => {
      expect((editor as any).draw.getZone().getZone()).to.eq(EditorZone.HEADER)
    })

    cy.get('@framePoints').then(payload => {
      const { x, footerY } = payload as { x: number; footerY: number }
      cy.get('canvas[data-index="0"]').dblclick(x, footerY, { force: true })
    })

    cy.getEditor().then((editor: Editor) => {
      expect((editor as any).draw.getZone().getZone()).to.eq(EditorZone.FOOTER)
    })
  })
})
