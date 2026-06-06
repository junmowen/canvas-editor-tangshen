/** 覆盖 TS-03 分栏定位回归，确保正文分栏坐标不会污染页眉页脚。 */
describe('header and footer keep their own coordinates with columns enabled', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 页眉页脚必须使用自身区域的 startY，不能被正文首栏 y 坐标覆盖。 */
  it('keeps header at top area and footer at bottom area', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 360,
        margins: [110, 24, 92, 24],
        columns: {
          count: 2,
          gap: 18,
          widths: [168, 168]
        },
        header: {
          top: 24
        },
        footer: {
          bottom: 24
        },
        pageNumber: {
          disabled: true
        }
      })
      editor.command.executeSetValue({
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              { value: '页眉第一行' },
              { value: '\n' },
              { value: '页眉第二行' }
            ]
          }
        ],
        main: [{ value: '正文分栏内容' }],
        footerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              { value: '页脚第一行' },
              { value: '\n' },
              { value: '页脚第二行' }
            ]
          }
        ]
      })
      editor.draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draw = editor.draw
      const margins = draw.getMargins()
      const header = draw.getHeader()
      const footer = draw.getFooter()
      const headerPosition = header.getPositionList()[0]
      const footerPosition = footer.getPositionList()[0]

      expect(header.getHeight()).to.be.greaterThan(20)
      expect(headerPosition.coordinate.leftTop[1]).to.eq(header.getHeaderTop())
      expect(headerPosition.coordinate.leftTop[1]).to.be.lessThan(margins[0])

      const expectedFooterTop =
        draw.getHeight() - footer.getFooterBottom() - footer.getHeight()
      expect(footer.getHeight()).to.be.greaterThan(20)
      expect(footerPosition.coordinate.leftTop[1]).to.eq(expectedFooterTop)
      expect(footerPosition.coordinate.leftTop[1]).to.be.greaterThan(
        draw.getHeight() / 2
      )
    })
  })
})
