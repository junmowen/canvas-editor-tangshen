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

function countPixelsInArea(
  canvas: HTMLCanvasElement,
  area: { x: number; y: number; width: number; height: number },
  predicate: (r: number, g: number, b: number, a: number) => boolean
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('ctx not found')
  }
  const scaleX = canvas.width / canvas.clientWidth
  const scaleY = canvas.height / canvas.clientHeight
  const x = Math.max(0, Math.floor(area.x * scaleX))
  const y = Math.max(0, Math.floor(area.y * scaleY))
  const width = Math.max(
    1,
    Math.min(canvas.width - x, Math.ceil(area.width * scaleX))
  )
  const height = Math.max(
    1,
    Math.min(canvas.height - y, Math.ceil(area.height * scaleY))
  )
  const image = ctx.getImageData(x, y, width, height).data
  let count = 0
  for (let index = 0; index < image.length; index += 4) {
    if (
      predicate(
        image[index],
        image[index + 1],
        image[index + 2],
        image[index + 3]
      )
    ) {
      count++
    }
  }
  return count
}

describe('#94 continuity mode large document', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
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
      const canvasList = Array.from(
        doc.querySelectorAll('canvas[data-index="0"][data-layer="base"]')
      ) as HTMLCanvasElement[]
      const canvas = canvasList[0] || null
      expect(canvas, 'continuity base canvas').to.not.eq(null)
      const wrapper = canvas!.parentElement as HTMLDivElement | null
      expect(wrapper, 'continuity page wrapper').to.not.eq(null)
      const canvasCssHeight = canvasList.reduce(
        (total, item) => total + item.clientHeight,
        0
      )
      expect(canvasList.length, 'continuity canvas tile count').to.be.greaterThan(1)
      expect(wrapper!.clientHeight, 'continuity wrapper css height').to.be.greaterThan(1123)
      expect(getComputedStyle(wrapper!).boxShadow, 'continuity wrapper shadow').to.not.eq('none')
      expect(getComputedStyle(wrapper!).overflow, 'continuity wrapper clips tile shadows').to.eq('hidden')
      canvasList.forEach((tileCanvas, index) => {
        expect(
          getComputedStyle(tileCanvas).boxShadow,
          `continuity tile ${index} computed shadow`
        ).to.eq('none')
      })
      Array.from(wrapper!.querySelectorAll('canvas')).forEach((tileCanvas, index) => {
        expect(
          getComputedStyle(tileCanvas).boxShadow,
          `continuity page canvas ${index} computed shadow`
        ).to.eq('none')
      })
      expect(canvasCssHeight, 'continuity tiled canvas css height').to.be.at.least(
        wrapper!.clientHeight
      )
      expect(canvas!.height, 'continuity canvas backing height').to.be.at.least(
        canvas!.clientHeight
      )
      expect(countNonWhitePixels(canvas!)).to.be.greaterThan(1000)
      expect(
        countNonWhitePixels(canvasList[canvasList.length - 1]),
        'last continuity tile content'
      ).to.be.greaterThan(100)
    })
  })

  it('does not limit continuity content to the previous paging page count', () => {
    cy.getEditor().then((editor: any) => {
      const main = Array.from({ length: 600 }, (_, index) => ({
        value: `continuity-limit-line-${index}-canvas-editor-long-content-for-wrap`
      }))

      editor.command.executeSetValue({
        header: [],
        main,
        footer: []
      })
      editor.command.executePageNumberRange({
        fromPageNo: 0,
        maxPageNo: 2
      })
    })

    cy.wait(300)

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const pagingRowCount = draw.getObjectResolver().getRowList().length
      const pagingVisibleRowCount = draw
        .getPageRowList()
        .reduce((total: number, rows: unknown[]) => total + rows.length, 0)

      expect(draw.getPageRowList().length, 'limited paging page count').to.eq(3)
      expect(pagingRowCount, 'full paging row count').to.be.greaterThan(
        pagingVisibleRowCount
      )

      editor.command.executePageMode('continuity' as any)

      cy.wait(300)

      cy.document().then(doc => {
        const wrapper = doc.querySelector('[data-index="0"]') as HTMLDivElement | null
        const continuousRowCount = draw.getObjectResolver().getRowList().length
        const continuousPositionBottom = draw
          .getCoordinate()
          .getMainPositionList()
          .reduce(
            (max: number, position: { coordinate: { leftBottom: number[]; rightBottom: number[] } }) =>
              Math.max(
                max,
                position.coordinate.leftBottom[1],
                position.coordinate.rightBottom[1]
              ),
            0
          )
        const expectedMinHeight =
          draw.getObjectResolver().getRowList().reduce(
            (total: number, row: { height: number; offsetY?: number }) =>
              total + row.height + (row.offsetY || 0),
            0
          ) + draw.getMainOuterHeight()

        expect(draw.getPageRowList().length, 'continuity page count').to.eq(1)
        expect(
          continuousRowCount,
          'continuity row count should return to full document'
        ).to.eq(pagingRowCount)
        expect(wrapper?.clientHeight, 'continuity wrapper height').to.be.at.least(
          expectedMinHeight - 1
        )
        expect(
          wrapper?.clientHeight,
          'continuity wrapper covers positioned content'
        ).to.be.at.least(continuousPositionBottom + draw.getMargins()[2] - 1)
      expect(wrapper?.clientHeight, 'not capped at three paper pages').to.be.greaterThan(
          draw.getHeight() * 3
        )
      })
    })
  })

  it('grows continuity height after typing into the document', () => {
    let beforeHeight = 0
    cy.getEditor().then((editor: any) => {
      const main = Array.from({ length: 120 }, (_, index) => ({
        value: `typing-continuity-line-${index}-canvas-editor-long-content-for-wrap`
      }))

      editor.command.executeSetValue({
        header: [],
        main,
        footer: []
      })
      editor.command.executePageMode('continuity' as any)
    })

    cy.wait(300)

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      beforeHeight = draw.getPageCanvasHost().getPageHeight(0)
      editor.command.executeSetRange(0, 0)
    })

    cy.get('.ce-inputarea').type('追加输入追加输入追加输入', {
      delay: 0,
      force: true
    })

    cy.wait(300)

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const afterHeight = draw.getPageCanvasHost().getPageHeight(0)
      expect(afterHeight, 'continuity height after typing').to.be.greaterThan(0)
      expect(afterHeight, 'continuity height after typing').to.be.greaterThan(
        1123
      )
      expect(afterHeight, 'continuity height should not shrink below paper height').to.be.at.least(beforeHeight)
    })
  })

  it('keeps visible content while plain text paste is batching in continuity mode', () => {
    const pasteText = Array.from(
      { length: 220 },
      (_, index) =>
        `plain-paste-${index}-canvas-editor-continuity-large-text-for-wrap`
    ).join('\n')

    cy.window().then(win => {
      const clipboardItem = {
        types: ['text/plain'],
        getType: () => Promise.resolve(new Blob([pasteText], { type: 'text/plain' }))
      }
      Object.defineProperty(win.navigator, 'clipboard', {
        configurable: true,
        value: {
          readText: () => Promise.resolve(pasteText),
          read: () => Promise.resolve([clipboardItem])
        }
      })
    })

    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [],
        main: Array.from({ length: 40 }, (_, index) => ({
          value: `before-plain-paste-${index}-canvas-editor-long-content-for-wrap`
        })),
        footer: []
      })
      editor.command.executePageMode('continuity' as any)
      editor.command.executeSetRange(0, 0)
      editor.command.executePaste()
    })

    cy.getEditor().should((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const stats = draw.getRenderBackendStats().asyncInsert
      expect(stats.startedCount, 'plain text paste uses async insert').to.be.greaterThan(0)
    })

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const canvas = draw
        .getPageCanvasHost()
        .getPageWrapperList()[0]
        .querySelector('canvas[data-layer="base"]') as HTMLCanvasElement | null
      expect(canvas, 'continuity base canvas after paste first batch').to.not.eq(null)
      expect(
        countNonWhitePixels(canvas!),
        'continuity base canvas is not blank during paste'
      ).to.be.greaterThan(100)
    })

    cy.wait(500)

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const wrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[0] as HTMLDivElement
      expect(
        wrapper.clientHeight,
        'continuity page grows after plain text paste'
      ).to.be.greaterThan(draw.getHeight())
    })
  })

  it('allows pointer selection below the first paper height in continuity mode', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [],
        main: Array.from({ length: 220 }, (_, index) => ({
          value: `continuity-pointer-line-${index}-canvas-editor-long-content-for-wrap`
        })),
        footer: []
      })
      editor.command.executePageMode('continuity' as any)
      editor.command.executeSetRange(0, 0)
    })

    cy.wait(300)

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const wrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[0] as HTMLDivElement
      const targetPosition = draw
        .getCoordinate()
        .getMainPositionList()
        .find(
          (position: any) =>
            position.pageNo === 0 &&
            position.coordinate.leftTop[1] > draw.getHeight() + 120
        )
      expect(targetPosition, 'target position below first paper height').to.exist

      const rect = wrapper.getBoundingClientRect()
      const clickX = rect.left + targetPosition.coordinate.leftTop[0] + 2
      const clickY = rect.top + targetPosition.coordinate.leftTop[1] + 2
      wrapper.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: clickX,
          clientY: clickY,
          button: 0
        })
      )
      wrapper.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          clientX: clickX,
          clientY: clickY,
          button: 0
        })
      )
      wrapper.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: clickX,
          clientY: clickY,
          button: 0
        })
      )
    })

    cy.wait(100)

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const range = draw.getRange().getEditBoundaryRange()
      const cursorPosition = draw.getCoordinate().getCursorPosition()
      expect(range.startIndex, 'clicked range is not left at document start').to.be.greaterThan(0)
      expect(range.startIndex, 'clicked range reaches lower continuity content').to.be.greaterThan(80)
      expect(cursorPosition?.pageNo, 'cursor stays on continuity page').to.eq(0)
      expect(draw.getZone().isMainActive(), 'click below paper height stays in main zone').to.eq(true)
    })
  })

  it('keeps empty trailing table rows inside the continuity page height', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          ...Array.from({ length: 80 }, (_, index) => ({
            value: `before-empty-table-${index}-canvas-editor-long-content-for-wrap`
          })),
          {
            type: 'table',
            value: '',
            colgroup: [{ width: 240 }, { width: 240 }],
            trList: Array.from({ length: 12 }, () => ({
              height: 42,
              tdList: [
                { colspan: 1, rowspan: 1, value: [] },
                { colspan: 1, rowspan: 1, value: [] }
              ]
            }))
          }
        ],
        footer: []
      })
      editor.command.executePageMode('continuity' as any)
    })

    cy.wait(300)

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const wrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[0] as HTMLDivElement
      const expectedMinHeight =
        draw.getObjectResolver().getRowList().reduce(
          (total: number, row: { height: number; offsetY?: number }) =>
            total + row.height + (row.offsetY || 0),
          0
        ) + draw.getMainOuterHeight()

      expect(wrapper.clientHeight, 'empty table rows are inside continuity height')
        .to.be.at.least(expectedMinHeight - 1)
    })
  })

  it('keeps continuity header footer only at document edges and repeats watermark without page numbers', () => {
    cy.getEditor().then((editor: any) => {
      const options = Reflect.get(editor, 'draw').getOptions()
      options.pageNumber.color = '#ff00ff'
      options.pageNumber.size = 32
      editor.command.executeAddWatermark({
        data: 'WM',
        color: '#0000ff',
        opacity: 1,
        size: 56,
        repeat: false
      })
      editor.command.executeSetValue({
        header: [
          {
            value: 'CONTINUITY_HEADER',
            color: '#ff0000',
            size: 28,
            bold: true
          }
        ],
        main: Array.from({ length: 170 }, (_, index) => ({
          value: `continuity-frame-line-${index}-canvas-editor-long-content-for-wrap`
        })),
        footer: [
          {
            value: 'CONTINUITY_FOOTER',
            color: '#008000',
            size: 24,
            bold: true
          }
        ]
      })
      editor.command.executePageMode('continuity' as any)
    })

    cy.wait(300)

    cy.getEditor().then((editor: any) => {
      const draw = Reflect.get(editor, 'draw')
      const pageHeight = draw.getHeight()
      const wrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[0] as HTMLDivElement
      const canvasList = Array.from(
        wrapper.querySelectorAll('canvas[data-layer="base"]')
      ) as HTMLCanvasElement[]
      const targetCanvas = canvasList.find(canvas => {
        const top = Number(canvas.style.top.replace('px', '') || '0')
        return top <= pageHeight && top + canvas.clientHeight > pageHeight
      })
      expect(targetCanvas, 'canvas covering second continuity paper').to.exist

      const canvasTop = Number(targetCanvas!.style.top.replace('px', '') || '0')
      const secondPageTop = pageHeight - canvasTop
      expect(
        countPixelsInArea(
          targetCanvas!,
          {
            x: 40,
            y: secondPageTop + 20,
            width: targetCanvas!.clientWidth - 80,
            height: 120
          },
          (r, g, b, a) => a > 0 && r > 180 && g < 80 && b < 80
        ),
        'continuity mode should not repeat header inside the long page'
      ).to.eq(0)
      expect(
        countPixelsInArea(
          targetCanvas!,
          {
            x: 40,
            y: secondPageTop + pageHeight - 150,
            width: targetCanvas!.clientWidth - 80,
            height: 130
          },
          (r, g, b, a) => a > 0 && r < 100 && g > 80 && b < 100
        ),
        'continuity mode should not repeat footer inside the long page'
      ).to.eq(0)
      expect(
        countPixelsInArea(
          targetCanvas!,
          {
            x: targetCanvas!.clientWidth / 2 - 180,
            y: secondPageTop + pageHeight / 2 - 180,
            width: 360,
            height: 360
          },
          (r, g, b, a) => a > 0 && r < 100 && g < 100 && b > 140
        ),
        'second paper watermark is rendered in continuity mode'
      ).to.be.greaterThan(20)
      expect(
        countPixelsInArea(
          targetCanvas!,
          {
            x: 260,
            y: secondPageTop + pageHeight - 90,
            width: 300,
            height: 70
          },
          (r, g, b, a) => a > 0 && r > 180 && g < 80 && b > 180
        ),
        'continuity mode still omits page number text'
      ).to.eq(0)
    })
  })
})
