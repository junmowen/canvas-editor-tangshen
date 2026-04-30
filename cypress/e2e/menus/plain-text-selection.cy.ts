import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'

type PointInfo = {
  index: number
  pageNo: number
  x: number
  y: number
  left: number
  right: number
  top: number
  bottom: number
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
        ),
        left: position.coordinate.leftTop[0],
        right: position.coordinate.rightTop[0],
        top: position.coordinate.leftTop[1],
        bottom: position.coordinate.leftBottom[1]
      }
    })
  }
  return []
}

describe('plain text selection', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('keeps inclusive selection while dragging forward and backward before mouseup', () => {
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
        .trigger('mousedown', start.x, start.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', end.x, end.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq('发热三')
    })

    cy.wait(120)

    cy.get('@plainTextPoints').then(payload => {
      const points = payload as PointInfo[]
      cy.document().then(doc => {
        expect(readCompositedPageBoxStats(doc, points[0].pageNo, points[0]).blueish).to.be.greaterThan(0)
        expect(readCompositedPageBoxStats(doc, points[1].pageNo, points[1]).blueish).to.be.greaterThan(0)
        expect(readCompositedPageBoxStats(doc, points[2].pageNo, points[2]).blueish).to.be.greaterThan(0)
        expect(readCompositedPageBoxStats(doc, points[3].pageNo, points[3]).blueish).to.eq(0)
      })
    })

    cy.get('@plainTextPoints').then(payload => {
      const points = payload as PointInfo[]
      const start = points[2]
      const end = points[0]
      cy.get(`canvas[data-index="${start.pageNo}"]`)
        .trigger('mouseup', start.x, start.y, {
          button: 0,
          force: true
        })
        .trigger('mousedown', start.x, start.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', end.x, end.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq('发热三')
    })

    cy.wait(120)

    cy.get('@plainTextPoints').then(payload => {
      const points = payload as PointInfo[]
      cy.document().then(doc => {
        expect(readCompositedPageBoxStats(doc, points[0].pageNo, points[0]).blueish).to.be.greaterThan(0)
        expect(readCompositedPageBoxStats(doc, points[1].pageNo, points[1]).blueish).to.be.greaterThan(0)
        expect(readCompositedPageBoxStats(doc, points[2].pageNo, points[2]).blueish).to.be.greaterThan(0)
        expect(readCompositedPageBoxStats(doc, points[3].pageNo, points[3]).blueish).to.eq(0)
      })
    })
  })

  it('keeps text selection aligned when dragging from an existing caret', () => {
    cy.getEditor().then((editor: Editor) => {
      const points = findPlainTextRun(editor, '发热三天')
      expect(points.length).to.eq(4)
      cy.wrap(points).as('plainTextCaretPoints')
    })

    cy.get('@plainTextCaretPoints').then(payload => {
      const points = payload as PointInfo[]
      const start = points[0]
      cy.get(`canvas[data-index="${start.pageNo}"]`)
        .click(start.x, start.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      cy.wrap({
        pageNo: cursor!.pageNo,
        x: Math.floor(cursor!.coordinate.rightTop[0]),
        y: Math.floor(cursor!.coordinate.leftTop[1] + 2)
      }).as('plainTextCaretRight')
    })

    cy.get('@plainTextCaretPoints').then(payload => {
      const points = payload as PointInfo[]
      cy.get('@plainTextCaretRight').then(caretPayload => {
        const caret = caretPayload as { pageNo: number; x: number; y: number }
        cy.get(`canvas[data-index="${caret.pageNo}"]`)
          .trigger('mousedown', caret.x, caret.y, {
            button: 0,
            force: true
          })
          .trigger('mousemove', points[2].x, points[2].y, {
            button: 0,
            force: true
          })
          .trigger('mouseup', points[2].x, points[2].y, {
            button: 0,
            force: true
          })
      })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq('热三')
    })

    cy.get('@plainTextCaretPoints').then(payload => {
      const points = payload as PointInfo[]
      const start = points[2]
      cy.get(`canvas[data-index="${start.pageNo}"]`)
        .click(start.x, start.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      cy.wrap({
        pageNo: cursor!.pageNo,
        x: Math.floor(cursor!.coordinate.rightTop[0]),
        y: Math.floor(cursor!.coordinate.leftTop[1] + 2)
      }).as('plainTextCaretLeft')
    })

    cy.get('@plainTextCaretPoints').then(payload => {
      const points = payload as PointInfo[]
      cy.get('@plainTextCaretLeft').then(caretPayload => {
        const caret = caretPayload as { pageNo: number; x: number; y: number }
        cy.get(`canvas[data-index="${caret.pageNo}"]`)
          .trigger('mousedown', caret.x, caret.y, {
            button: 0,
            force: true
          })
          .trigger('mousemove', points[0].x, points[0].y, {
            button: 0,
            force: true
          })
          .trigger('mouseup', points[0].x, points[0].y, {
            button: 0,
            force: true
          })
      })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq('热三')
    })
  })

  it('keeps text selection aligned when dragging again from the same character box after click', () => {
    cy.getEditor().then((editor: Editor) => {
      const points = findPlainTextRun(editor, '发热三天')
      expect(points.length).to.eq(4)
      cy.wrap(points).as('plainTextSameBoxPoints')
    })

    cy.get('@plainTextSameBoxPoints').then(payload => {
      const points = payload as PointInfo[]
      cy.get(`canvas[data-index="${points[0].pageNo}"]`)
        .click(points[0].x, points[0].y, {
          force: true
        })
    })

    cy.get('@plainTextSameBoxPoints').then(payload => {
      const points = payload as PointInfo[]
      cy.get(`canvas[data-index="${points[0].pageNo}"]`)
        .trigger('mousedown', points[0].x, points[0].y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', points[2].x, points[2].y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', points[2].x, points[2].y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq('发热三')
    })

    cy.get('@plainTextSameBoxPoints').then(payload => {
      const points = payload as PointInfo[]
      cy.get(`canvas[data-index="${points[2].pageNo}"]`)
        .click(points[2].x, points[2].y, {
          force: true
        })
    })

    cy.get('@plainTextSameBoxPoints').then(payload => {
      const points = payload as PointInfo[]
      cy.get(`canvas[data-index="${points[2].pageNo}"]`)
        .trigger('mousedown', points[2].x, points[2].y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', points[0].x, points[0].y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', points[0].x, points[0].y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq('发热三')
    })
  })
})
