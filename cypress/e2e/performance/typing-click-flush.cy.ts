/** 生成多页文档，用于覆盖输入态 chunk patch 后的点击切换。 */
function createLargeDocument(lineCount: number) {
  return Array.from({ length: lineCount }, (_, index) => ({
    value: `typing-click-flush-${index} 这是用于验证输入后点击不丢失显示的长文档。\n`
  }))
}

/** 生成含复杂元素的多页文档，用于覆盖 chunk 失败后的单行正式 patch。 */
function createLargeDocumentWithComplexPage(lineCount: number) {
  const main = createLargeDocument(lineCount)
  main.splice(14, 0, {
    value: '',
    type: 'separator'
  })
  return main
}

/** 读取指定元素位置附近的正文像素，用于验证文字是否真的落在 base canvas 上。 */
function readTextBandPixelStats(payload: {
  editor: any
  index: number
  padding?: number
}) {
  const { editor, index, padding = 4 } = payload
  const draw = editor.draw
  const position = draw.getPosition().getLayoutMainPositionList()[index]
  expect(position, '待检测文字位置').to.exist
  const canvas = draw
    .getPageCanvasHost()
    .getSurface(position.pageNo, 'base')
    ?.canvas as HTMLCanvasElement | undefined
  expect(canvas, '待检测页 base canvas').to.exist
  const dpr = canvas!.width / canvas!.clientWidth
  const left = Math.max(
    0,
    Math.floor((position.coordinate.leftTop[0] - padding) * dpr)
  )
  const top = Math.max(
    0,
    Math.floor((position.coordinate.leftTop[1] - padding) * dpr)
  )
  const width = Math.max(
    1,
    Math.ceil(
      (position.coordinate.rightBottom[0] -
        position.coordinate.leftTop[0] +
        padding * 2) *
        dpr
    )
  )
  const height = Math.max(
    1,
    Math.ceil(
      (position.coordinate.rightBottom[1] -
        position.coordinate.leftTop[1] +
        padding * 2) *
        dpr
    )
  )
  const ctx = canvas!.getContext('2d')!
  const imageData = ctx.getImageData(left, top, width, height).data
  let inkPixelCount = 0
  for (let i = 0; i < imageData.length; i += 4) {
    const alpha = imageData[i + 3]
    const red = imageData[i]
    const green = imageData[i + 1]
    const blue = imageData[i + 2]
    // 正文黑字通常是高 alpha 且 RGB 不接近白色；这里排除纯透明和白底。
    if (alpha > 16 && red + green + blue < 735) {
      inkPixelCount++
    }
  }
  return {
    pageNo: position.pageNo,
    left,
    top,
    width,
    height,
    inkPixelCount
  }
}

describe('输入态点击刷新回归', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('keeps newly typed content visible after clicking another position', () => {
    cy.window().then(() => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        const insertedText = 'dddddddddddddddddddd'
        const insertedElementList = insertedText.split('').map(value => ({ value }))

        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(1200),
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)
        editor.command.executeInsertElementList(insertedElementList, {
          isSubmitHistory: false
        })

        cy.get('canvas[data-index="0"]')
          .click(90, 180, { force: true })
          .then(() => {
            const stats = editor.getRenderBackendStats()
            const layoutText = draw
              .getLayoutMainElementList()
              .map((element: { value?: string }) => element.value || '')
              .join('')

            expect(stats.chunkLayout.patchSuccessCount).to.be.greaterThan(0)
            expect(stats.layout.computeCount).to.eq(0)
            expect(layoutText).to.include(insertedText)
          })
      })
    })
  })

  it('keeps paragraph layout stable after consecutive chunk typing', () => {
    cy.window().then(() => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        const insertedText = 'chunklayoutstable'
        const insertedElementList = insertedText
          .split('')
          .map(value => ({ value }))

        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(1200),
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(12, 12)

        insertedElementList.forEach((element: { value: string }) => {
          editor.command.executeInsertElementList([element], {
            isSubmitHistory: false
          })
        })

        cy.get('canvas[data-index="0"]')
          .click(120, 220, { force: true })
          .then(() => {
            const stats = editor.getRenderBackendStats()
            const layoutText = draw
              .getLayoutMainElementList()
              .map((element: { value?: string }) => element.value || '')
              .join('')
            const positionList = draw.getPosition().getPositionList()
            const isPositionIndexStable = positionList.every(
              (position: { index: number }, index: number) =>
                position?.index === index
            )

            expect(stats.chunkLayout.patchSuccessCount).to.be.greaterThan(0)
            expect(stats.layout.computeCount).to.eq(0)
            expect(layoutText).to.include(insertedText)
            expect(isPositionIndexStable).to.eq(true)
          })
      })
    })
  })

  it('shifts following page rows after a middle chunk grows', () => {
    cy.window().then(() => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        const insertedText = 'middlechunkgrow'.repeat(12)
        const insertedElementList = insertedText
          .split('')
          .map(value => ({ value }))

        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(1200),
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(160, 160)
        editor.command.executeInsertElementList(insertedElementList, {
          isSubmitHistory: false
        })

        cy.get('canvas[data-index="0"]')
          .click(120, 260, { force: true })
          .then(() => {
            const stats = editor.getRenderBackendStats()
            const layoutText = draw
              .getLayoutMainElementList()
              .map((element: { value?: string }) => element.value || '')
              .join('')
            const pagePositionList = draw
              .getPosition()
              .getLayoutMainPositionListByPage(0)
            const rowTopMap = new Map<number, number>()

            pagePositionList.forEach(
              (position: { rowNo: number; coordinate: { leftTop: number[] } }) => {
                if (!rowTopMap.has(position.rowNo)) {
                  rowTopMap.set(position.rowNo, position.coordinate.leftTop[1])
                }
              }
            )

            const rowTopList = Array.from(rowTopMap.values())
            const isRowTopIncreasing = rowTopList.every((top, index) => {
              return index === 0 || top >= rowTopList[index - 1]
            })

            expect(stats.chunkLayout.patchSuccessCount).to.be.greaterThan(0)
            expect(stats.layout.computeCount).to.eq(0)
            expect(layoutText).to.include(insertedText)
            expect(isRowTopIncreasing).to.eq(true)
          })
      })
    })
  })

  it('keeps real typed text after cursor moves away', () => {
    cy.window().then(() => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        const insertedText = 'realtypestays'

        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(1200),
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(160, 160)
        cy.get('.ce-inputarea')
          .type(insertedText, { force: true, delay: 0 })
          .then(() => {
            cy.get('canvas[data-index="0"]').click(120, 260, { force: true })
          })
          .then(() => {
            const stats = editor.getRenderBackendStats()
            const layoutText = draw
              .getLayoutMainElementList()
              .map((element: { value?: string }) => element.value || '')
              .join('')

            expect(stats.chunkLayout.patchSuccessCount).to.be.greaterThan(0)
            expect(stats.layout.computeCount).to.eq(0)
            expect(layoutText).to.include(insertedText)
          })
      })
    })
  })

  it('keeps real typed text pixels after click away and click back', () => {
    cy.window().then(() => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        const insertedText = 'pixeltypestays'
        const startIndex = 160

        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(1200),
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(startIndex, startIndex)
        cy.get('.ce-inputarea')
          .type(insertedText, { force: true, delay: 0 })
          .then(() => {
            const stats = editor.getRenderBackendStats()
            const typedPixelStats = readTextBandPixelStats({
              editor,
              index: startIndex
            })
            expect(stats.chunkLayout.patchSuccessCount).to.be.greaterThan(0)
            expect(stats.layout.computeCount).to.eq(0)
            expect(typedPixelStats.inkPixelCount, '输入后文字像素').to.be.greaterThan(0)
          })
          .then(() => {
            cy.get('canvas[data-index="0"]').click(120, 260, { force: true })
          })
          .then(() => {
            const clickAwayPixelStats = readTextBandPixelStats({
              editor,
              index: startIndex
            })
            expect(clickAwayPixelStats.inkPixelCount, '点击别处后文字像素').to.be.greaterThan(0)
          })
          .then(() => {
            const firstPosition = draw
              .getPosition()
              .getLayoutMainPositionList()[startIndex]
            cy.get(`canvas[data-index="${firstPosition.pageNo}"]`).click(
              firstPosition.coordinate.leftTop[0] + 2,
              firstPosition.coordinate.leftTop[1] + 2,
              { force: true }
            )
          })
          .then(() => {
            const clickBackPixelStats = readTextBandPixelStats({
              editor,
              index: startIndex
            })
            const layoutText = draw
              .getLayoutMainElementList()
              .map((element: { value?: string }) => element.value || '')
              .join('')

            expect(layoutText).to.include(insertedText)
            expect(clickBackPixelStats.inkPixelCount, '点回输入处后文字像素').to.be.greaterThan(0)
          })
      })
    })
  })

  it('keeps typed pixels on complex page with page chunk rebalance', () => {
    cy.window().then(() => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        const insertedText = 'linefallbackstays'
        const startIndex = 12

        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocumentWithComplexPage(1200),
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(startIndex, startIndex)
        cy.get('.ce-inputarea')
          .type(insertedText, { force: true, delay: 0 })
          .then(() => {
            cy.wait(700)
          })
          .then(() => {
            cy.get('canvas[data-index="0"]').click(120, 260, { force: true })
          })
          .then(() => {
            const stats = editor.getRenderBackendStats()
            const layoutText = draw
              .getLayoutMainElementList()
              .map((element: { value?: string }) => element.value || '')
              .join('')
            const clickAwayPixelStats = readTextBandPixelStats({
              editor,
              index: startIndex
            })

            expect(stats.chunkLayout.patchSuccessCount, '页级 chunk rebalance 成功次数').to.be.greaterThan(0)
            expect(
              stats.typingLinePatch.patchSuccessCount,
              '单行 fallback 不应抢页级 rebalance'
            ).to.eq(0)
            expect(stats.layout.computeCount).to.eq(0)
            expect(layoutText).to.include(insertedText)
            expect(clickAwayPixelStats.inkPixelCount, '复杂页点击后文字像素').to.be.greaterThan(0)
          })
      })
    })
  })

  it('propagates page chunk overflow asynchronously across following pages', () => {
    cy.window().then(() => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        const insertedText = 'asyncchunkoverflow'.repeat(55)
        const insertedElementList = [{ value: insertedText }]

        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(1600),
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)
        editor.command.executeInsertElementList(insertedElementList, {
          isSubmitHistory: false
        })

        cy.wrap(null, { timeout: 20000 })
          .should(() => {
            const stats = editor.getRenderBackendStats()
            expect(
              stats.chunkLayout.pageRebalanceAsyncPatchCount,
              '页级 chunk 异步传播次数'
            ).to.be.greaterThan(0)
            expect(
              stats.chunkLayout.pageRebalancePendingPageCount,
              '页级 chunk 异步队列应清空'
            ).to.eq(0)
            expect(
              stats.chunkLayout.dirtyRangePlanCount,
              'dirty range planner 应参与传播规划'
            ).to.be.greaterThan(0)
            expect(
              stats.chunkLayout.dirtyRangeMissActualCount,
              'dirty range planner 不应漏掉实际影响页'
            ).to.eq(0)
            expect(
              stats.chunkLayout.dirtyRangeScheduleTakeoverCount,
              'dirty range planner 应接管异步传播起点'
            ).to.be.greaterThan(0)
            expect(
              stats.chunkLayout.dirtyRangeScheduleFallbackCount,
              '普通 overflow 不应回退经验式传播'
            ).to.eq(0)
          })
          .then(() => {
            const stats = editor.getRenderBackendStats()
            const layoutText = draw
              .getLayoutMainElementList()
              .map((element: { value?: string }) => element.value || '')
              .join('')
            const positionList = draw.getPosition().getPositionList()
            const isPositionIndexStable = positionList.every(
              (position: { index: number }, index: number) =>
                position?.index === index
            )

            expect(stats.layout.computeCount).to.eq(0)
            expect(stats.chunkLayout.pageRebalanceScheduleCount).to.be.greaterThan(0)
            expect(stats.chunkLayout.pageRebalanceBoundaryPropagateCount).to.be.greaterThan(0)
            expect(layoutText).to.include(insertedText)
            expect(isPositionIndexStable).to.eq(true)
          })
      })
    })
  })

  it('propagates page chunk deletion gaps asynchronously across following pages', () => {
    cy.window().then(() => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw

        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(1600),
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(1200, 1200)
        for (let index = 0; index < 500; index++) {
          editor.command.executeBackspace()
        }

        cy.wrap(null, { timeout: 20000 })
          .should(() => {
            const stats = editor.getRenderBackendStats()
            expect(
              stats.chunkLayout.pageRebalanceAsyncPatchCount,
              '删除后页级 chunk 异步补行次数'
            ).to.be.greaterThan(0)
            expect(
              stats.chunkLayout.pageRebalancePendingPageCount,
              '删除后页级 chunk 异步队列应清空'
            ).to.eq(0)
            expect(
              stats.chunkLayout.dirtyRangePlanCount,
              '删除补行应输出 dirty range'
            ).to.be.greaterThan(0)
            expect(
              stats.chunkLayout.dirtyRangeMissActualCount,
              '删除补行 dirty range 不应漏页'
            ).to.eq(0)
            expect(
              stats.chunkLayout.dirtyRangeScheduleTakeoverCount,
              '删除补行应由 planner 接管传播起点'
            ).to.be.greaterThan(0)
            expect(
              stats.chunkLayout.dirtyRangeScheduleFallbackCount,
              '删除补行不应回退经验式传播'
            ).to.eq(0)
          })
          .then(() => {
            const stats = editor.getRenderBackendStats()
            const positionList = draw.getPosition().getPositionList()
            const isPositionIndexStable = positionList.every(
              (position: { index: number }, index: number) =>
                position?.index === index
            )
            const isPageRowStartStable = draw
              .getPageRowList()
              .flat()
              .every((row: { startIndex: number }, index: number, rowList: Array<{ startIndex: number }>) => {
                return index === 0 || row.startIndex >= rowList[index - 1].startIndex
              })

            expect(stats.layout.computeCount).to.eq(0)
            expect(stats.chunkLayout.pageRebalanceScheduleCount).to.be.greaterThan(0)
            expect(isPositionIndexStable).to.eq(true)
            expect(isPageRowStartStable).to.eq(true)
          })
      })
    })
  })
})
