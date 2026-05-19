const SIGNATURE_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSIzMCI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjRkZGIi8+PHBhdGggZD0iTTUgMjBRMjAgNSAzNSAyMFE1MCAzNSA3NSAxMCIgc3Ryb2tlPSIjMTExIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjMiLz48L3N2Zz4='

type PerformanceSample = {
  label: string
  duration: number
}

function measure(win: Window, label: string, fn: () => void): PerformanceSample {
  const start = win.performance.now()
  fn()
  return {
    label,
    duration: win.performance.now() - start
  }
}

function createText(value: string, extra: Record<string, unknown> = {}) {
  return {
    value,
    size: 16,
    ...extra
  }
}

function createControl(pageNo: number) {
  return {
    type: 'control',
    value: '',
    control: {
      conceptId: `clinic-diagnosis-${pageNo}`,
      type: 'text',
      value: [{ value: '上呼吸道感染' }],
      placeholder: '诊断',
      prefix: '{',
      postfix: '}'
    }
  }
}

function createSignatureImage(pageNo: number) {
  return {
    id: `clinic-signature-${pageNo}`,
    type: 'image',
    value: SIGNATURE_IMAGE,
    width: 80,
    height: 30
  }
}

function createClinicTable() {
  return {
    id: 'clinic-cross-page-table',
    type: 'table',
    value: '',
    width: 554,
    colgroup: [{ width: 138 }, { width: 138 }, { width: 138 }, { width: 140 }],
    trList: Array.from({ length: 72 }, (_, rowIndex) => ({
      height: 42,
      minHeight: 42,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `项目${rowIndex + 1}` }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `结果${rowIndex + 1}` }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: rowIndex % 3 === 0 ? '偏高' : '正常' }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: '复查随访' }]
        }
      ]
    }))
  }
}

function appendClinicPage(main: any[], pageNo: number) {
  main.push(
    createText(`门诊病历 第${pageNo + 1}页\n`, {
      type: 'title',
      level: 1,
      valueList: [{ value: `门诊病历 第${pageNo + 1}页`, size: 18 }]
    }),
    createText(`主诉：发热三天，咳嗽五天。页码标记 clinic-page-${pageNo}\n`),
    createText(
      '现病史：患者三天前无明显诱因出现发热，伴咳嗽、咽痛、乏力，夜间症状加重，门诊复诊后继续观察。\n'
    ),
    createText(
      '既往史：糖尿病十年，高血压两年，否认药物过敏史，否认近期疫区接触史。\n'
    ),
    createText('体格检查：T 39.5℃，P 80次/分，R 20次/分，BP 120/80mmHg。\n'),
    createText('门诊诊断：'),
    createControl(pageNo),
    createText('\n处置治疗：完善血常规、CRP、胸片检查，必要时复诊。\n')
  )
  if (pageNo === 2) {
    main.push(createText('辅助检查明细：\n'), createClinicTable())
  }
  if (pageNo % 25 === 0) {
    main.push(createText('医师签名：'), createSignatureImage(pageNo), createText('\n'))
  }
  if (pageNo % 10 === 9) {
    main.push({
      type: 'separator',
      value: ''
    })
  }
  main.push({
    type: 'pageBreak',
    value: '\n'
  })
}

function createClinicTemplate(minPageCount: number) {
  const main: any[] = []
  for (let pageNo = 0; pageNo < minPageCount; pageNo++) {
    appendClinicPage(main, pageNo)
  }
  main.push(createText(`clinic-template-end-${minPageCount}\n`))
  return {
    header: [
      createText('唐神医院门诊病历\n'),
      createText('姓名：测试患者  科室：呼吸内科\n')
    ],
    main,
    footer: [
      createText('本病历仅用于性能压测与回归验证\n'),
      createText('医师：系统测试\n')
    ]
  }
}

function applyClinicOptions(editor: any) {
  editor.listener.rangeStyleChange = null
  const options = editor.draw.getOptions()
  options.pageNumber.disabled = false
  options.pageNumber.format = '第{pageNo}页/共{pageCount}页'
  options.watermark.data = '门诊病历草稿'
  options.watermark.size = 90
  options.watermark.opacity = 0.08
  options.watermark.repeat = true
}

function getPlainText(elementList: Array<{ value?: string }>) {
  return elementList.map(element => element.value || '').join('')
}

function findTextIndexOnPage(editor: any, pageNo: number) {
  const position = editor.draw
    .getPosition()
    .getLayoutMainPositionListByPage(pageNo)
    .find((item: any) => {
      // 中段正文锚点必须避开标题和控件，否则插入会落入结构化标题或控件值。
      return (
        item.element?.value &&
        !item.element.type &&
        !item.element.titleId &&
        item.element.level === undefined &&
        !item.element.controlId &&
        !item.element.controlComponent
      )
    })
  expect(position, `第 ${pageNo} 页应存在可编辑正文`).to.exist
  return position.index
}

function assertTemplateIntegrity(editor: any, minPageCount: number) {
  const draw = editor.draw
  const pageRowList = draw.getPageRowList()
  const value = editor.command.getValue({ extraPickAttrs: ['id'] }).data
  const main = value.main
  const mainText = getPlainText(main)
  const middlePageNo = Math.floor(pageRowList.length / 2)
  const middlePagePositionCount = draw
    .getPosition()
    .getLayoutMainPositionListByPage(middlePageNo).length

  expect(pageRowList.length).to.be.at.least(minPageCount)
  expect(getPlainText(value.header)).to.include('唐神医院门诊病历')
  expect(getPlainText(value.footer)).to.include('性能压测')
  expect(main.some((element: any) => element.type === 'table')).to.eq(true)
  expect(main.some((element: any) => element.type === 'control')).to.eq(true)
  expect(main.some((element: any) => element.type === 'image')).to.eq(true)
  expect(mainText).to.include(`clinic-template-end-${minPageCount}`)
  expect(pageRowList[middlePageNo].length, '中间页应有行数据').to.be.greaterThan(3)
  expect(middlePagePositionCount, '中间页 position 不应只剩一小段').to.be.greaterThan(20)
}

function waitForAsyncQueues(editor: any) {
  return cy.wrap(null, { timeout: 20000 }).should(() => {
    const stats = editor.getRenderBackendStats()
    expect(stats.chunkLayout.pageRebalancePendingPageCount).to.eq(0)
    expect(stats.asyncInsert.active).to.eq(false)
  })
}

function assertDocumentTextStoreStats(editor: any) {
  const stats = editor.getRenderBackendStats()
  const mainLength = editor.draw.getOriginalMainElementList().length
  expect(stats.documentTextStore).to.exist
  expect(stats.documentTextStore.type).to.eq('array')
  expect(stats.documentTextStore.length).to.eq(mainLength)
  expect(stats.documentTextStore.version).to.be.at.least(0)
  expect(stats.documentTextStore.operationCount).to.be.at.least(0)
  expect(stats.documentTextStore.externalMutationCount).to.be.at.least(0)
  expect(stats.documentTextStore.mirrorEnabled).to.eq(true)
  expect(stats.documentTextStore.mirrorMode).to.eq('shadow-write')
  expect(stats.documentTextStore.mirrorHealthy).to.eq(true)
  expect(stats.documentTextStore.mirrorLastMatch).to.eq(true)
  expect(stats.documentTextStore.mirrorMismatchCount).to.eq(0)
  expect(stats.documentTextStore.mirrorLength).to.eq(mainLength)
  expect(stats.documentTextStore.mirrorSignature).to.be.a('string')
  expect(stats.documentTextStore.mirrorReplayCount).to.be.at.least(0)
  expect(stats.documentTextStore.mirrorReplayMismatchCount).to.eq(0)
  expect(stats.documentTextStore.mirrorReplaySkippedCount).to.be.at.least(0)
}

function assertDocumentTextStoreReplayed(editor: any, minReplayCount = 1) {
  const stats = editor.getRenderBackendStats()
  assertDocumentTextStoreStats(editor)
  expect(stats.documentTextStore.mirrorReplayCount).to.be.at.least(minReplayCount)
  expect(stats.documentTextStore.mirrorReplayMismatchCount).to.eq(0)
  expect(stats.documentTextStore.mirrorReplaySkippedCount).to.eq(0)
}

function countInkPixelsInDataUrl(win: Window, dataUrl: string) {
  return new Cypress.Promise<number>((resolve, reject) => {
    const image = new win.Image()
    image.onload = () => {
      const canvas = win.document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let count = 0
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] > 16 && data[index] + data[index + 1] + data[index + 2] < 735) {
          count++
        }
      }
      resolve(count)
    }
    image.onerror = reject
    image.src = dataUrl
  })
}

describe('真实门诊病历模板压测基线', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
    cy.on('uncaught:exception', error => {
      if (
        error.message.includes('innerText') &&
        error.stack?.includes('rangeStyleChange')
      ) {
        return false
      }
    })
  })

  it('builds 20 / 100 / 500 page clinic template baselines', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const samples: PerformanceSample[] = []
        ;[20, 100, 500].forEach(minPageCount => {
          editor.resetRenderBackendStats()
          applyClinicOptions(editor)
          samples.push(
            measure(win, `setValue-clinic-${minPageCount}`, () => {
              editor.command.executeSetValue(createClinicTemplate(minPageCount), {
                isSetCursor: true
              })
            })
          )
          assertTemplateIntegrity(editor, minPageCount)
          const stats = editor.getRenderBackendStats()
          expect(stats.backend.missCount).to.eq(0)
          expect(stats.tableSnapshot.build.buildCount).to.be.greaterThan(0)
          expect(stats.layout.computeCount).to.be.greaterThan(0)
          assertDocumentTextStoreStats(editor)
        })
        // eslint-disable-next-line no-console
        console.table(samples)
      })
    })
  })

  it('keeps front, middle and table edits consistent on a 100 page clinic template', () => {
    cy.getEditor().then((editor: any) => {
      applyClinicOptions(editor)
      editor.command.executeSetValue(createClinicTemplate(100), {
        isSetCursor: true
      })

      editor.resetRenderBackendStats()
      editor.command.executeSetRange(10, 10)
      editor.command.executeInsertElementList([{ value: '复诊记录' }])
      waitForAsyncQueues(editor).then(() => {
        let stats = editor.getRenderBackendStats()
        expect(stats.layout.computeCount).to.eq(0)
        expect(stats.chunkLayout.dirtyRangeMissActualCount).to.eq(0)

        const middlePageNo = Math.floor(editor.draw.getPageRowList().length / 2)
        const middleIndex = findTextIndexOnPage(editor, middlePageNo)
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(middleIndex, middleIndex)
        editor.command.executeInsertElementList([{ value: '中段补录' }])
        return waitForAsyncQueues(editor).then(() => {
          stats = editor.getRenderBackendStats()
          const text = getPlainText(editor.command.getValue().data.main)
          expect(stats.layout.computeCount).to.eq(0)
          expect(stats.chunkLayout.dirtyRangeMissActualCount).to.eq(0)
          expect(stats.documentTextStore.externalMutationCount).to.be.greaterThan(0)
          expect(stats.documentTextStore.lastOperation?.type).to.eq('external-splice')
          expect(stats.documentTextStore.mirrorReplayCount).to.be.greaterThan(0)
          expect(stats.documentTextStore.mirrorReplayMismatchCount).to.eq(0)
          expect(stats.documentTextStore.mirrorReplaySkippedCount).to.eq(0)
          expect(text).to.include('复诊记录')
          expect(text).to.include('中段补录')

          const elementList = editor.draw.getOriginalMainElementList()
          const tableIndex = elementList.findIndex((element: any) => {
            return element.id === 'clinic-cross-page-table'
          })
          expect(tableIndex).to.be.greaterThan(-1)
          editor.resetRenderBackendStats()
          editor.command.executeSetPositionContext({
            startIndex: tableIndex,
            endIndex: tableIndex,
            tableId: 'clinic-cross-page-table',
            startTdIndex: 0,
            endTdIndex: 0,
            startTrIndex: 0,
            endTrIndex: 0
          })
          editor.command.executeSetRange(
            0,
            0,
            'clinic-cross-page-table',
            0,
            0,
            0,
            0
          )
          editor.command.executeInsertElementList([{ value: '表格补录' }])
          return waitForAsyncQueues(editor).then(() => {
            const value = editor.command.getValue({ extraPickAttrs: ['id'] }).data
            const table = value.main.find((element: any) => {
              return element.id === 'clinic-cross-page-table'
            })
            const cellText = getPlainText(table.trList[0].tdList[0].value)
            expect(cellText).to.include('表格补录')
            assertDocumentTextStoreStats(editor)
            assertTemplateIntegrity(editor, 100)

            const deleteIndex = editor.draw
              .getOriginalMainElementList()
              .findIndex((element: any) => element.value === '中')
            expect(deleteIndex, '应找到中段补录的正文字符').to.be.greaterThan(-1)
            const textBeforeDelete = getPlainText(
              editor.command.getValue().data.main
            )
            editor.resetRenderBackendStats()
            editor.command.executeSetPositionContext({
              startIndex: deleteIndex,
              endIndex: deleteIndex
            })
            editor.command.executeSetRange(deleteIndex, deleteIndex)
            editor.command.executeBackspace()
            return waitForAsyncQueues(editor).then(() => {
              const deleteStats = editor.getRenderBackendStats()
              const textAfterDelete = getPlainText(
                editor.command.getValue().data.main
              )
              expect(textAfterDelete.length).to.be.lessThan(textBeforeDelete.length)
              expect(deleteStats.documentTextStore.lastOperation?.type).to.eq(
                'external-splice'
              )
              assertDocumentTextStoreReplayed(editor)

              editor.resetRenderBackendStats()
              editor.command.executeUndo()
              return waitForAsyncQueues(editor).then(() => {
                const undoStats = editor.getRenderBackendStats()
                expect(undoStats.documentTextStore.lastOperation?.type).to.eq(
                  'replace-all'
                )
                assertDocumentTextStoreReplayed(editor)

                editor.resetRenderBackendStats()
                editor.command.executeRedo()
                return waitForAsyncQueues(editor).then(() => {
                  const redoStats = editor.getRenderBackendStats()
                  expect(redoStats.documentTextStore.lastOperation?.type).to.eq(
                    'replace-all'
                  )
                  assertDocumentTextStoreReplayed(editor)
                })
              })
            })
          })
        })
      })
    })
  })

  it('keeps large paste, export and middle pages stable on a 100 page clinic template', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        applyClinicOptions(editor)
        editor.command.executeSetValue(createClinicTemplate(100), {
          isSetCursor: true
        })
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(30, 30)
        const pastedText = Array.from({ length: 1200 }, (_, index) => {
          return `large-clinic-paste-${index}\n`
        }).join('')
        editor.command.executeInsertElementList([{ value: pastedText }])
        expect(editor.getRenderBackendStats().asyncInsert.startedCount).to.eq(1)

        waitForAsyncQueues(editor).then(() => {
          const stats = editor.getRenderBackendStats()
          const text = getPlainText(editor.command.getValue().data.main)
          expect(stats.asyncInsert.completedCount).to.eq(1)
          expect(stats.asyncInsert.lastFinalLayoutDurationMs).to.be.greaterThan(0)
          expect(stats.documentTextStore.operationCount).to.be.greaterThan(0)
          expect(stats.documentTextStore.mirrorReplayCount).to.be.greaterThan(0)
          expect(stats.documentTextStore.mirrorReplayMismatchCount).to.eq(0)
          expect(stats.documentTextStore.mirrorReplaySkippedCount).to.eq(0)
          expect(text).to.include('large-clinic-paste-1199')
          assertDocumentTextStoreStats(editor)
          assertTemplateIntegrity(editor, 100)

          return cy.wrap(editor.command.getImage({ pixelRatio: 0.25 })).then(
            (base64List: string[]) => {
              expect(base64List.length).to.be.greaterThan(50)
              expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(false)
              return countInkPixelsInDataUrl(win, base64List[0]).then(inkPixelCount => {
                expect(inkPixelCount, '导出图片应包含病历内容像素').to.be.greaterThan(20)
              })
            }
          )
        })
      })
    })
  })

  it('keeps render cache and memory stats bounded after scrolling a 500 page clinic template', () => {
    cy.getEditor().then((editor: any) => {
      applyClinicOptions(editor)
      editor.command.executeSetValue(createClinicTemplate(500), {
        isSetCursor: true
      })
      editor.resetRenderBackendStats()
      const draw = editor.draw
      const pageCount = draw.getPageRowList().length
      const middlePageNo = Math.floor(pageCount / 2)
      draw.enqueueExtraVisibleRenderPages([middlePageNo, pageCount - 1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        pageRenderScope: 'visible'
      })

      cy.wrap(null, { timeout: 20000 })
        .should(() => {
          const stats = editor.getRenderBackendStats()
          expect(stats.backend.missCount).to.eq(0)
          expect((stats.backend.pageEngineStatsList || []).length).to.be.greaterThan(0)
        })
        .then(() => {
          const stats = editor.getRenderBackendStats()
          expect(stats.backend.missCount).to.eq(0)
          expect(stats.memory.estimatedTotalMB).to.be.lessThan(768)
          const bitmapCacheCount =
            stats.surface.bitmapCacheCount ?? stats.surface.bitmapCache?.count
          const bitmapCacheMaxCount =
            stats.surface.bitmapCacheMaxCount ?? stats.surface.bitmapCache?.maxCount ?? 24
          if (bitmapCacheCount !== undefined) {
            expect(bitmapCacheCount).to.be.at.most(bitmapCacheMaxCount)
          }
          assertDocumentTextStoreStats(editor)
          assertTemplateIntegrity(editor, 500)
        })
    })
  })

  it('observes worker render hit and fallback stats on 100 / 500 page clinic templates', () => {
    [100, 500].forEach(minPageCount => {
      cy.getEditor().then((editor: any) => {
        applyClinicOptions(editor)
        editor.draw.getOptions().renderBackend.offscreenCanvas.enabled = true
        editor.command.executeSetValue(createClinicTemplate(minPageCount), {
          isSetCursor: true
        })

        const draw = editor.draw
        const pageCount = draw.getPageRowList().length
        expect(pageCount, `${minPageCount} 页模板分页数`).to.be.at.least(
          minPageCount
        )
        draw.setPageNo(0)
        draw.getRange().setRange(0, 0)
        draw.getServices().workerRenderScheduler.dispose()
        draw.getPageCanvasHost().invalidateAllBitmapCache()
        editor.resetRenderBackendStats()
        const targetPageList = Array.from(
          new Set([
            Math.min(4, pageCount - 1),
            Math.floor(pageCount / 2),
            pageCount - 1
          ])
        ).filter(pageNo => pageNo > 0)
        draw.enqueueExtraVisibleRenderPages(targetPageList)
        draw.render({
          isCompute: false,
          isSubmitHistory: false,
          isSetCursor: false,
          isLazy: false,
          pageRenderScope: 'visible'
        })
      })

      cy.getEditor().then((editor: any) => {
        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          expect(
            stats.workerRender.successCount,
            `${minPageCount} 页 worker 成功次数`
          ).to.be.greaterThan(0)
        })
      })

      cy.getEditor().then((editor: any) => {
        const stats = editor.getRenderBackendStats()
        expect(stats.backend.missCount, `${minPageCount} 页 backend miss`).to.eq(0)
        expect(
          stats.backend.backendHitCountMap['offscreen-canvas'],
          `${minPageCount} 页 offscreen 命中`
        ).to.be.greaterThan(0)
        expect(
          stats.baseRenderSource.workerRenderCount,
          `${minPageCount} 页 worker base 来源`
        ).to.be.greaterThan(0)
        expect(
          stats.surface.bitmapCache.setCountBySource['worker-render'],
          `${minPageCount} 页 worker bitmap cache 写入`
        ).to.be.greaterThan(0)
        expect(stats.workerRender.lastFallbackReason || '').to.be.a('string')
        expect(stats.workerRender.circuitOpen, `${minPageCount} 页未熔断`).to.eq(false)
        expect(
          stats.workerRender.pendingCount +
            stats.workerRender.activeCount +
            stats.workerRender.queuedCount,
          `${minPageCount} 页 worker 队列清空`
        ).to.eq(0)
        assertDocumentTextStoreStats(editor)
        assertTemplateIntegrity(editor, minPageCount)
      })
    })
  })
})
