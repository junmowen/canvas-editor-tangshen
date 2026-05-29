import Editor from '../../../src/editor'

describe('菜单-打印', () => {
  let initialPageCount = 0

  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas[data-index]')
      .should($canvas => {
        expect($canvas.length).to.be.greaterThan(1)
      })
      .then($canvas => {
        initialPageCount = $canvas.length
      })
  })

  it('打印', () => {
    cy.getEditor().then(async (editor: Editor) => {
      const imageList2 = await editor.command.getImage()
      expect(imageList2.length).to.eq(initialPageCount)

      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      cy.wait(200).then(async () => {
        const imageList1 = await editor.command.getImage()
        expect(imageList1.length).to.eq(1)
      })
    })
  })
})
