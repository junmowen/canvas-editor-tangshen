import Editor from '../../../src/editor'

const ZERO = '\u200B'

describe('blank area double click', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('ignores double click in the main blank area without throwing', () => {
    let caughtError: Error | null = null
    cy.on('uncaught:exception', err => {
      caughtError = err
      return false
    })

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: 'blank'.split('').map(value => ({ value })),
        footer: []
      })
      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      cy.wrap({
        x: draw.getMargins()[3] + 20,
        y: draw.getHeight() - draw.getMargins()[2] - 20
      }).as('blankPoint')
    })

    cy.get('@blankPoint').then(payload => {
      const point = payload as { x: number; y: number }
      cy.get('canvas[data-index="0"]').dblclick(point.x, point.y, {
        force: true
      })
    })

    cy.then(() => {
      expect(caughtError).to.eq(null)
    })
  })

  it('does not scan past the element list for collapsed blank paragraph ranges', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [{ value: ZERO }],
          footer: []
        },
        {
          isSetCursor: true
        } as any
      )
      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      const position = draw.getPosition()
      const positionList = position.getPositionList()
      expect(positionList.length).to.be.greaterThan(0)
      position.setPositionList([
        ...positionList,
        {
          ...positionList[0],
          index: positionList[0].index + 1
        }
      ])

      editor.command.executeSetRange(0, 0)

      let paragraphInfo: unknown = null
      expect(() => {
        paragraphInfo = draw.getRange().getRangeParagraphInfo()
      }).not.to.throw()
      expect(paragraphInfo).to.not.eq(null)
    })
  })
})
