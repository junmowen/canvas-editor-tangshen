import Editor from '../../../src/editor'

describe('range paragraph boundary guard', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('does not throw when paragraph range points outside current position mapping', () => {
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const rangeManager = draw.getRange()
      const elementLength = draw.getElementList().length
      // 模拟双击取词时拿到无法映射到主文档 positionList 的逻辑索引。
      rangeManager.setRange(elementLength + 10, elementLength + 10)

      expect(() => {
        rangeManager.getRangeParagraphInfo()
      }).to.not.throw()
      expect(rangeManager.getRangeParagraphInfo()).to.eq(null)
    })
  })
})
