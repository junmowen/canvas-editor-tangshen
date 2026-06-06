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
    const alpha = image[index + 3]
    if (alpha > 0 && (r < 250 || g < 250 || b < 250)) {
      nonWhite++
    }
  }
  return nonWhite
}

function buildLargeDocument(lineCount: number) {
  return Array.from({ length: lineCount }, (_, index) => ({
    value: `perf-line-${index}-canvas-editor-large-document\n`
  }))
}

function buildThirtyThousandCharacterDocument() {
  const line = 'canvas-editor-large-document-visible-content-'
  return Array.from({ length: 700 }, (_, index) => ({
    value: `${line}${String(index).padStart(4, '0')}\n`
  }))
}

describe('issue #837 large document performance baseline', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('renders a paged large document without blank pages', () => {
    cy.getEditor().then((editor: any) => {
      const start = performance.now()
      editor.command.executeSetValue({
        header: [],
        main: buildLargeDocument(1200),
        footer: []
      })
      const duration = performance.now() - start

      expect(duration, 'large document setValue duration').to.be.lessThan(10000)
      expect(editor.draw.getPageRowList().length).to.be.greaterThan(10)
      editor.draw.getServices().pageRenderer.immediateRender()
    })

    cy.document().then(doc => {
      const firstPage = doc.querySelector(
        'canvas[data-index="0"]'
      ) as HTMLCanvasElement | null
      const secondPage = doc.querySelector(
        'canvas[data-index="1"]'
      ) as HTMLCanvasElement | null
      expect(firstPage, 'first paged canvas').to.not.eq(null)
      expect(secondPage, 'second paged canvas').to.not.eq(null)
      expect(countNonWhitePixels(firstPage!)).to.be.greaterThan(1000)
      expect(countNonWhitePixels(secondPage!)).to.be.greaterThan(1000)
    })
  })

  it('issue #1312 renders thirty-thousand-character content without blanking pages', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [],
        main: buildThirtyThousandCharacterDocument(),
        footer: []
      })

      expect(editor.command.getText().main.length).to.be.greaterThan(30000)
      expect(editor.draw.getPageRowList().length).to.be.greaterThan(6)
      editor.draw.getServices().pageRenderer.immediateRender()
    })

    cy.document().then(doc => {
      const firstPage = doc.querySelector(
        'canvas[data-index="0"]'
      ) as HTMLCanvasElement | null
      const secondPage = doc.querySelector(
        'canvas[data-index="1"]'
      ) as HTMLCanvasElement | null
      expect(firstPage, 'first large text canvas').to.not.eq(null)
      expect(secondPage, 'second large text canvas').to.not.eq(null)
      expect(countNonWhitePixels(firstPage!)).to.be.greaterThan(1000)
      expect(countNonWhitePixels(secondPage!)).to.be.greaterThan(1000)
    })
  })

  it('keeps non-compute visible refresh scoped to visible and active pages', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [],
        main: buildLargeDocument(800),
        footer: []
      })

      const pageRenderer = editor.draw.getServices().pageRenderer
      const originalDrawPage = pageRenderer.drawPage.bind(pageRenderer)
      const layoutPipeline = editor.draw.getServices().layoutPipeline
      const originalCompute = layoutPipeline.compute.bind(layoutPipeline)
      const renderedPages: number[] = []
      const computeDurations: number[] = []
      pageRenderer.drawPage = (payload: { pageNo: number }) => {
        renderedPages.push(payload.pageNo)
        return originalDrawPage(payload)
      }
      layoutPipeline.compute = () => {
        const computeStart = performance.now()
        const result = originalCompute()
        computeDurations.push(performance.now() - computeStart)
        return result
      }

      editor.draw.setVisiblePageNoList([0])
      editor.command.executeSetRange(0, 0)
      editor.draw.render({
        isCompute: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })

      expect([...new Set(renderedPages)]).to.deep.eq([0])
      expect(editor.draw.getPageRowList().length).to.be.greaterThan(6)

      pageRenderer.drawPage = originalDrawPage
    })
  })

  it('keeps typing refresh scoped to visible pages in a 30-page document', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [],
        main: buildLargeDocument(1500),
        footer: []
      })
      expect(editor.draw.getPageRowList().length).to.be.greaterThan(29)

      editor.draw.setVisiblePageNoList([0])
      editor.command.executeSetRange(0, 0)
      const rawComputeRowList = editor.draw.computeRowList
      const originalComputeRowList = rawComputeRowList.bind(editor.draw)
      let maxComputeElementLength = 0
      editor.draw.computeRowList = (payload: { elementList: unknown[] }) => {
        maxComputeElementLength = Math.max(
          maxComputeElementLength,
          payload.elementList.length
        )
        return originalComputeRowList(payload)
      }
      const start = performance.now()
      editor.draw.getComponents().canvasEvent.input('x', {
        isAsyncRender: true
      })
      const duration = performance.now() - start
      const flushStart = performance.now()
      editor.draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
      const flushDuration = performance.now() - flushStart

      expect(duration, 'single character input duration').to.be.lessThan(1000)
      expect(flushDuration, 'single character frame render duration').to.be.lessThan(250)
      expect(maxComputeElementLength, 'incremental layout element count').to.be.lessThan(80)
      expect(editor.command.getText().main.startsWith('xperf-line-0')).to.eq(true)
      editor.draw.computeRowList = rawComputeRowList
    })
  })

  it('coalesces rapid typing refreshes before repainting a 30-page document', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [],
        main: buildLargeDocument(1500),
        footer: []
      })

      editor.draw.setVisiblePageNoList([0])
      editor.command.executeSetRange(0, 0)
      const renderFacade = editor.draw.getServices().renderFacadeService
      const originalRender = renderFacade.render.bind(renderFacade)
      let renderCount = 0
      renderFacade.render = (payload: unknown) => {
        renderCount += 1
        return originalRender(payload)
      }

      const start = performance.now()
      editor.draw.getComponents().canvasEvent.input('a', {
        isAsyncRender: true
      })
      editor.draw.getComponents().canvasEvent.input('b', {
        isAsyncRender: true
      })
      editor.draw.getComponents().canvasEvent.input('c', {
        isAsyncRender: true
      })
      const duration = performance.now() - start

      expect(duration, 'three queued character inputs duration').to.be.lessThan(1000)
      expect(renderCount, 'render before frame flush').to.eq(0)

      const flushStart = performance.now()
      editor.draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
      const flushDuration = performance.now() - flushStart

      expect(flushDuration, 'coalesced frame render duration').to.be.lessThan(250)
      expect(editor.command.getText().main.startsWith('abcperf-line-0')).to.eq(
        true
      )

      return new Cypress.Promise<void>(resolve => {
        requestAnimationFrame(() => {
          expect(renderCount, 'coalesced render count').to.be.at.most(1)
          renderFacade.render = originalRender
          resolve()
        })
      })
    })
  })
})
