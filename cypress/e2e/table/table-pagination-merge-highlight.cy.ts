import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'

type HitPoint = {
  pageNo: number
  x: number
  y: number
  trIndex: number
  tdIndex: number
}

function findLastRowEmptyCellPoints(win: Window, editor: Editor) {
  const hits: HitPoint[] = []
  const canvasList = Array.from(
    win.document.querySelectorAll('canvas[data-index]')
  ) as HTMLCanvasElement[]
  canvasList.forEach(canvas => {
    const rect = canvas.getBoundingClientRect()
    const pageNo = Number(canvas.dataset.index || 0)
    for (let y = 20; y < rect.height - 20; y += 10) {
      for (let x = 20; x < rect.width - 20; x += 14) {
        const evt = new win.MouseEvent('mousemove', {
          bubbles: true,
          clientX: rect.left + x,
          clientY: rect.top + y
        })
        Object.defineProperty(evt, 'target', {
          configurable: true,
          value: canvas
        })
        Object.defineProperty(evt, 'offsetX', {
          configurable: true,
          value: x
        })
        Object.defineProperty(evt, 'offsetY', {
          configurable: true,
          value: y
        })
        const hit = editor.command.getPositionContextByEvent(evt, {
          isMustDirectHit: false
        })
        if (hit?.tableInfo?.trIndex === 9) {
          hits.push({
            pageNo,
            x,
            y,
            trIndex: hit.tableInfo.trIndex,
            tdIndex: hit.tableInfo.tdIndex
          })
        }
      }
    }
  })
  const leftHit = hits.find(hit => hit.tdIndex === 0)
  const rightHit = hits.find(
    hit => hit.tdIndex === 1 && hit.pageNo === leftHit?.pageNo && hit.y === leftHit?.y
  )
  if (!leftHit || !rightHit) {
    return null
  }
  return {
    leftHit,
    rightHit
  }
}

describe('menu-table pagination merge highlight', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('shows highlight before merging cross-cell selection in paged mock table', () => {
    cy.window().then(win => {
      const editor = (win as any).editor as Editor
      const target = findLastRowEmptyCellPoints(win, editor)
      expect(target).to.not.eq(null)
      cy.wrap(target!).as('mergeHighlightTarget')
    })

    cy.get('@mergeHighlightTarget').then(payload => {
      const { leftHit, rightHit } = payload as {
        leftHit: HitPoint
        rightHit: HitPoint
      }
      cy.get(`canvas[data-index="${leftHit.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', leftHit.x, leftHit.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', rightHit.x, rightHit.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', rightHit.x, rightHit.y, {
          button: 0,
          force: true
        })
    })

    cy.wait(50)

    cy.get('@mergeHighlightTarget').then(payload => {
      const { leftHit, rightHit } = payload as {
        leftHit: HitPoint
        rightHit: HitPoint
      }
      cy.document().then(doc => {
        const leftBlueish = readCompositedPageBoxStats(doc, leftHit.pageNo, {
          left: leftHit.x - 8,
          right: leftHit.x + 8,
          top: leftHit.y - 12,
          bottom: leftHit.y + 12
        }).blueish
        const rightBlueish = readCompositedPageBoxStats(doc, rightHit.pageNo, {
          left: rightHit.x - 8,
          right: rightHit.x + 8,
          top: rightHit.y - 12,
          bottom: rightHit.y + 12
        }).blueish
        expect(leftBlueish).to.be.greaterThan(0)
        expect(rightBlueish).to.be.greaterThan(0)
      })
    })
  })
})
