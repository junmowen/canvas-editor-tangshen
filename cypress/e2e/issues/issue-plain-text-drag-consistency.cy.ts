import Editor from '../../../src/editor'

type PointInfo = {
  index: number
  pageNo: number
  x: number
  y: number
}

function findPlainTextRun(editor: Editor, target: string): PointInfo[] {
  const draw = (editor as any).draw
  const elementList = draw.getOriginalMainElementList()
  const positionList = draw.getPosition().getPositionList()
  const chars = target.split('')
  for (let start = 0; start <= elementList.length - chars.length; start++) {
    let matched = true
    for (let offset = 0; offset < chars.length; offset++) {
      if (elementList[start + offset]?.value !== chars[offset]) {
        matched = false
        break
      }
    }
    if (!matched) continue
    return chars.map((_, offset) => {
      const index = start + offset
      const position = positionList[index]
      return {
        index,
        pageNo: position.pageNo,
        x: Math.floor(
          (position.coordinate.leftTop[0] + position.coordinate.rightTop[0]) / 2
        ),
        y: Math.floor(
          (position.coordinate.leftTop[1] + position.coordinate.leftBottom[1]) / 2
        )
      }
    })
  }
  return []
}

describe('plain text drag consistency', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('keeps the same range text when dragging forward and backward on plain text', () => {
    cy.getEditor().then((editor: Editor) => {
      const points = findPlainTextRun(editor, '发热三天')
      expect(points.length).to.eq(4)
      cy.wrap(points).as('plainTextPoints')
    })

    cy.get('@plainTextPoints').then(payload => {
      const points = payload as PointInfo[]
      const start = points[0]
      const end = points[2]
      cy.get(`canvas[data-index="${start.pageNo}"]`)
        .trigger('mousedown', start.x, start.y, { button: 0, force: true })
        .trigger('mousemove', end.x, end.y, { button: 0, force: true })
        .trigger('mouseup', end.x, end.y, { button: 0, force: true })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq('发热三')
    })

    cy.get('@plainTextPoints').then(payload => {
      const points = payload as PointInfo[]
      const start = points[2]
      const end = points[0]
      cy.get(`canvas[data-index="${start.pageNo}"]`)
        .trigger('mousedown', start.x, start.y, { button: 0, force: true })
        .trigger('mousemove', end.x, end.y, { button: 0, force: true })
        .trigger('mouseup', end.x, end.y, { button: 0, force: true })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq('发热三')
    })
  })
})
