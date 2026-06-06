import type Editor from '../../../src/editor'
import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { EditorZone } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import type { IElement } from '../../../src/editor/interface/Element'

const getText = (elementList: IElement[]) =>
  elementList
    .map(element => element.value)
    .join('')
    .replace(new RegExp(ZERO, 'g'), '')

describe('header and footer double click editing', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  function prepareHeaderFooter(editor: Editor) {
    editor.command.executeSetValue({
      headerPageScopes: [
        { pageScope: 'all', elementList: [{ value: 'header' }] }
      ],
      main: [{ value: 'main' }],
      footerPageScopes: [
        { pageScope: 'all', elementList: [{ value: 'footer' }] }
      ]
    })
    ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
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

  it('enters the scoped header data for the clicked page', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        headerPageScopes: [
          { pageScope: 'first', elementList: [{ value: 'first-header' }] },
          { pageScope: 'even', elementList: [{ value: 'even-header' }] },
          { pageScope: 'odd', elementList: [{ value: 'odd-header' }] }
        ],
        main: [
          { value: 'page-one' },
          { type: ElementType.PAGE_BREAK, value: '\n' },
          { value: 'page-two' },
          { type: ElementType.PAGE_BREAK, value: '\n' },
          { value: 'page-three' }
        ]
      })
      ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
      const draw = (editor as any).draw
      const scale = editor.command.getOptions().scale
      const headerY =
        draw.getHeader().getHeaderTop() + draw.getHeader().getHeight(0) / 2
      cy.wrap({
        firstX: draw.getMargins(0)[3] + 30 * scale,
        headerY
      }).as('scopedHeaderPoints')
    })

    cy.get('@scopedHeaderPoints').then(payload => {
      const { firstX, headerY } = payload as { firstX: number; headerY: number }
      cy.get('canvas[data-index="0"]').dblclick(firstX, headerY, {
        force: true
      })
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      expect(draw.getZone().getZone()).to.eq(EditorZone.HEADER)
      expect(draw.getZone().getZonePageNo()).to.eq(0)
      expect(getText(draw.getObjectResolver().getOriginalElementList())).to.eq(
        'first-header'
      )

      draw.getZone().setZone(EditorZone.HEADER, 1)
      expect(draw.getZone().getZonePageNo()).to.eq(1)
      expect(getText(draw.getObjectResolver().getOriginalElementList())).to.eq(
        'even-header'
      )
      draw.getZone().setZone(EditorZone.HEADER, 2)
      expect(draw.getZone().getZone()).to.eq(EditorZone.HEADER)
      expect(draw.getZone().getZonePageNo()).to.eq(2)
      expect(getText(draw.getObjectResolver().getOriginalElementList())).to.eq(
        'odd-header'
      )
    })
  })
})
