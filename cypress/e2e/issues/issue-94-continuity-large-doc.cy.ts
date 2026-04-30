function countNonWhitePixels(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('ctx not found')
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let nonWhite = 0
  for (let index = 0; index < image.length; index += 4) {
    const r = image[index]
    const g = image[index + 1]
    const b = image[index + 2]
    const a = image[index + 3]
    if (a > 0 && (r < 250 || g < 250 || b < 250)) {
      nonWhite++
    }
  }
  return nonWhite
}

describe('#94 continuity mode large document', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas').first().as('canvas').should('have.length', 1)
  })

  it('renders a large continuity document without blanking the page', () => {
    cy.getEditor().then((editor: any) => {
      const main = Array.from({ length: 2000 }, (_, index) => ({
        value: `large-line-${index}-canvas-editor-`
      }))

      editor.command.executeSetValue({
        header: [],
        main,
        footer: []
      })
      editor.command.executePageMode('continuity' as any)
    })

    cy.wait(300)

    cy.document().then(doc => {
      const canvas = doc.querySelector(
        'canvas[data-index="0"]'
      ) as HTMLCanvasElement | null
      expect(canvas, 'continuity base canvas').to.not.eq(null)
      expect(canvas!.height).to.be.greaterThan(720)
      expect(countNonWhitePixels(canvas!)).to.be.greaterThan(1000)
    })
  })
})
