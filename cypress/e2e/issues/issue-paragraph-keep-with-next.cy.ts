/** 覆盖 TS-05 keepWithNext，验证标题不会孤立在页底。 */
describe('paragraph keep with next', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证 keepWithNext 会在下一段放不下时提前把当前行移到下一页。 */
  it('keeps heading and following paragraph on the same page', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 180,
        margins: [20, 20, 20, 20],
        header: {
          disabled: true
        },
        footer: {
          disabled: true
        },
        pageNumber: {
          disabled: true
        }
      })
      editor.command.executeSetValue({
        main: [
          { value: '填充一' },
          { value: '\n' },
          { value: '填充二' },
          { value: '\n' },
          { value: '填充三' },
          { value: '\n' },
          {
            value: '标题',
            keepWithNext: true
          },
          { value: '\n' },
          { value: '正文段落' }
        ]
      })

      const positionList = editor.draw.getCoordinate().getMainPositionList()
      const headingPosition = positionList.find((position: any) => {
        return position.element?.keepWithNext && position.value === '标'
      })
      const bodyPosition = positionList.find((position: any) => {
        return position.value === '正'
      })

      expect(headingPosition.pageNo).to.eq(1)
      expect(bodyPosition.pageNo).to.eq(headingPosition.pageNo)
    })
  })
})
