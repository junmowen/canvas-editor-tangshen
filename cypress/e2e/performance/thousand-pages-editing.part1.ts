import { EditorZone } from '../../../src/editor/dataset/enum/Editor'

type PerformanceSample = {
  label: string
  duration: number
}

/** 生成大文档数据，用浏览器真实布局压测输入链路。 */
function createLargeDocument(lineCount: number) {
  return Array.from({ length: lineCount }, (_, index) => ({
    value: `performance-page-${index} 这是一段用于 1000 页编辑性能压测的文本内容，覆盖输入、快速粘贴和删除。\n`
  }))
}

/** 记录同步操作耗时。 */
function measure(win: Window, label: string, fn: () => void): PerformanceSample {
  const start = win.performance.now()
  fn()
  return {
    label,
    duration: win.performance.now() - start
  }
}

/** 统计导出图片中的非白色像素，确认 flush 后导出的不只是空白页。 */
function countInkPixelsInDataUrl(win: Window, dataUrl: string) {
  return new Cypress.Promise<number>((resolve, reject) => {
    const image = new win.Image()
    image.onload = () => {
      const canvas = win.document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let inkPixelCount = 0
      for (let index = 0; index < imageData.length; index += 4) {
        const red = imageData[index]
        const green = imageData[index + 1]
        const blue = imageData[index + 2]
        const alpha = imageData[index + 3]
        if (alpha > 16 && red + green + blue < 735) {
          inkPixelCount++
        }
      }
      resolve(inkPixelCount)
    }
    image.onerror = reject
    image.src = dataUrl
  })
}

describe('1000 页编辑性能压测', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })
  it('keeps typing, paste and delete operations measurable on a huge document', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const samples: PerformanceSample[] = []
        const draw = editor.draw

        samples.push(
          measure(win, 'setValue-large-document', () => {
            editor.command.executeSetValue(
              {
                header: [],
                main: createLargeDocument(12000),
                footer: []
              },
              {
                isSetCursor: true
              }
            )
          })
        )

        draw.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        samples.push(
          measure(win, 'type-20-chars', () => {
            for (let index = 0; index < 20; index++) {
              win.dispatchEvent(new InputEvent('input'))
              editor.command.executeInsertElementList(
                [{ value: String(index % 10) }],
                { isSubmitHistory: index === 19 }
              )
            }
          })
        )
        samples.push(
          measure(win, 'paste-200-chars', () => {
            editor.command.executeInsertElementList(
              Array.from({ length: 200 }, (_, index) => ({
                value: String(index % 10)
              }))
            )
          })
        )

        samples.push(
          measure(win, 'delete-10-times', () => {
            for (let index = 0; index < 10; index++) {
              editor.command.executeBackspace()
            }
          })
        )

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          expect(stats.chunkLayout.pageRebalancePendingPageCount).to.eq(0)
        }).then(() => {
          const stats = editor.getRenderBackendStats()
          // eslint-disable-next-line no-console
          console.table(samples)
          // eslint-disable-next-line no-console
          console.log('render backend stats', stats)

          expect(draw.getPageCanvasHost().getPageCount()).to.be.greaterThan(100)
          expect(stats.backend.missCount).to.eq(0)
          // 商业级 chunk 管线直接写回运行时布局，程序化输入和删除不再强制经过预览层。
          expect(stats.chunkLayout.attemptCount).to.be.greaterThan(0)
          expect(stats.chunkLayout.patchSuccessCount).to.be.greaterThan(0)
          expect(stats.chunkLayout.pageRebalanceSyncPatchCount).to.be.greaterThan(0)
          expect(stats.chunkLayout.pageRebalanceScheduleCount).to.be.greaterThan(0)
          expect(stats.chunkLayout.pageRebalancePendingPageCount).to.eq(0)
          expect(stats.chunkLayout.dirtyRangePlanCount).to.be.greaterThan(0)
          expect(stats.chunkLayout.dirtyRangeMissActualCount).to.eq(0)
          expect(stats.chunkLayout.dirtyRangeLastPageCount).to.be.greaterThan(0)
          expect(stats.documentChunk.chunkCount).to.be.greaterThan(100)
          expect(stats.documentChunk.dirtyChunkCount).to.be.greaterThan(0)
          expect(stats.documentChunk.layoutCacheSetCount).to.be.greaterThan(0)
          expect(stats.layout.computeCount).to.eq(0)
          // 高频编辑同步路径必须保持毫秒级；输入态不能回退到整篇 layout。
          expect(samples.find(item => item.label === 'type-20-chars')!.duration).to.be.lessThan(500)
          expect(samples.find(item => item.label === 'paste-200-chars')!.duration).to.be.lessThan(500)
          expect(samples.find(item => item.label === 'delete-10-times')!.duration).to.be.lessThan(500)
        })
      })
    })
  })

  it('keeps middle pages populated after a large paste creates many pages', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(200),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const pastedElementList = createLargeDocument(2400)
        const sample = measure(win, 'paste-200-pages-first-batch', () => {
          editor.command.executeInsertElementList(pastedElementList)
        })
        const firstStats = editor.getRenderBackendStats()
        expect(firstStats.asyncInsert.startedCount).to.eq(1)
        expect(firstStats.asyncInsert.active).to.eq(true)
        expect(firstStats.asyncInsert.status).to.eq('active')
        expect(firstStats.asyncInsert.currentFirstBatchDurationMs).to.be.greaterThan(0)

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          const layoutText = draw
            .getLayoutMainElementList()
            .map((element: { value?: string }) => element.value || '')
            .join('')
          expect(layoutText).to.include('performance-page-2399')
          expect(stats.chunkLayout.pageRebalancePendingPageCount).to.eq(0)
        }).then(() => {
          const pageRowList = draw.getPageRowList()
          const positionList = draw.getCoordinate().getMainPositionList()
          const middlePageNo = Math.floor(pageRowList.length / 2)
          const middlePageRows = pageRowList[middlePageNo] || []
          const middlePagePositionCount = positionList.filter(
            (position: { pageNo: number }) => position.pageNo === middlePageNo
          ).length

          // eslint-disable-next-line no-console
          console.table([sample])
          const stats = editor.getRenderBackendStats()
          expect(stats.asyncInsert.completedCount).to.eq(1)
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.status).to.eq('completed')
          expect(stats.asyncInsert.lastFinishReason).to.eq('completed')
          expect(stats.asyncInsert.lastFirstBatchDurationMs).to.be.greaterThan(0)
          expect(stats.asyncInsert.lastBackgroundBatchDurationMs).to.be.greaterThan(0)
          expect(stats.asyncInsert.lastFinalLayoutDurationMs).to.be.greaterThan(0)
          expect(stats.asyncInsert.maxBatchDurationMs).to.be.greaterThan(0)
          expect(stats.asyncInsert.lastFinalPageCount).to.eq(pageRowList.length)
          expect(pageRowList.length).to.be.greaterThan(20)
          expect(middlePageRows.length, '中间页应有完整页行数据').to.be.greaterThan(3)
          expect(
            middlePagePositionCount,
            '中间页 positionList 不能只保留开头一小段'
          ).to.be.greaterThan(30)
          expect(sample.duration).to.be.lessThan(1500)
        })
      })
    })
  })

  it('does not freeze when a single pasted text element expands to many pages', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = createLargeDocument(900)
          .map(element => element.value)
          .join('')
        const sample = measure(win, 'paste-single-long-text-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        const firstStats = editor.getRenderBackendStats()
        expect(firstStats.asyncInsert.startedCount).to.eq(1)
        expect(firstStats.asyncInsert.active).to.eq(true)
        expect(firstStats.asyncInsert.status).to.eq('active')

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const layoutText = draw
            .getLayoutMainElementList()
            .map((element: { value?: string }) => element.value || '')
            .join('')
          expect(layoutText).to.include('performance-page-899')
        }).then(() => {
          const stats = editor.getRenderBackendStats()
          expect(stats.asyncInsert.completedCount).to.eq(1)
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.status).to.eq('completed')
          expect(stats.asyncInsert.lastFinalLayoutDurationMs).to.be.greaterThan(0)
          expect(draw.getPageRowList().length).to.be.greaterThan(16)
          expect(sample.duration).to.be.lessThan(500)
        })
      })
    })
  })

  it('cancels a pending large paste transaction when setValue replaces document data', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = createLargeDocument(1200)
          .map(element => element.value)
          .join('')
        measure(win, 'paste-then-replace-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        editor.command.executeSetValue(
          {
            header: [],
            main: [{ value: 'replacement-after-cancel\n' }],
            footer: []
          },
          {
            isSetCursor: true
          }
        )

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          const layoutText = draw
            .getLayoutMainElementList()
            .map((element: { value?: string }) => element.value || '')
            .join('')
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.canceledCount).to.eq(1)
          expect(stats.asyncInsert.status).to.eq('canceled')
          expect(stats.asyncInsert.lastCancelReason).to.eq('set-value')
          expect(layoutText).to.include('replacement-after-cancel')
          expect(layoutText).not.to.include('performance-page-1199')
        })
      })
    })
  })

  it('cancels a pending large paste transaction when a direct splice mutation happens', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = createLargeDocument(1200)
          .map(element => element.value)
          .join('')
        measure(win, 'paste-then-splice-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        const elementList = draw.getObjectResolver().getElementList()
        draw.spliceElementList(elementList, 1, 5)
        draw.render({
          curIndex: 1,
          isTyping: true,
          typingEditIndex: 1,
          typingInsertedCount: -5,
          isSkipTypingPreview: true,
          isLazy: false,
          pageRenderScope: 'visible'
        })

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          const layoutText = draw
            .getLayoutMainElementList()
            .map((element: { value?: string }) => element.value || '')
            .join('')
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.canceledCount).to.eq(1)
          expect(stats.asyncInsert.status).to.eq('canceled')
          expect(stats.asyncInsert.lastCancelReason).to.eq('splice-element-list')
          expect(layoutText).not.to.include('performance-page-1199')
        })
      })
    })
  })

  it('cancels a pending large paste transaction when typing continues', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = createLargeDocument(1200)
          .map(element => element.value)
          .join('')
        measure(win, 'paste-then-typing-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        editor.command.executeInsertElementList([
          { value: 'manual-after-cancel' }
        ])

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          const layoutText = draw
            .getLayoutMainElementList()
            .map((element: { value?: string }) => element.value || '')
            .join('')
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.canceledCount).to.eq(1)
          expect(stats.asyncInsert.status).to.eq('canceled')
          expect(stats.asyncInsert.lastCancelReason).to.eq('insert-element-list')
          expect(layoutText).to.include('manual-after-cancel')
          expect(layoutText).not.to.include('performance-page-1199')
        })
      })
    })
  })

  it('flushes a pending large paste transaction before getValue reads data', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = createLargeDocument(1200)
          .map(element => element.value)
          .join('')
        measure(win, 'paste-then-get-value-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        const value = editor.command.getValue()
        const text = value.data.main
          .map((element: { value?: string }) => element.value || '')
          .join('')
        const stats = editor.getRenderBackendStats()
        expect(stats.asyncInsert.active).to.eq(false)
        expect(stats.asyncInsert.completedCount).to.eq(1)
        expect(stats.asyncInsert.status).to.eq('completed')
        expect(stats.asyncInsert.lastFinishReason).to.eq('flush')
        expect(stats.asyncInsert.lastFlushReason).to.eq('get-value')
        expect(stats.asyncInsert.lastFinalLayoutDurationMs).to.be.greaterThan(0)
        expect(text).to.include('performance-page-1199')
      })
    })
  })

  it('flushes a pending large paste transaction before undo restores history', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = createLargeDocument(1200)
          .map(element => element.value)
          .join('')
        measure(win, 'paste-then-undo-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        editor.command.executeUndo()

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          const layoutText = draw
            .getLayoutMainElementList()
            .map((element: { value?: string }) => element.value || '')
            .join('')
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.completedCount).to.eq(1)
          expect(stats.asyncInsert.status).to.eq('completed')
          expect(stats.asyncInsert.lastFinishReason).to.eq('flush')
          expect(stats.asyncInsert.lastFlushReason).to.eq('command-undo')
          expect(layoutText).not.to.include('performance-page-1199')
          expect(layoutText).to.include('performance-page-19')
        })
      })
    })
  })

  it('flushes a pending large paste transaction before redo restores history', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = editor.draw
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.command.executeSetRange(10, 10)
        editor.command.executeInsertElementList([{ value: 'redo-anchor' }])
        editor.command.executeUndo()
        editor.resetRenderBackendStats()

        const longText = createLargeDocument(1200)
          .map(element => element.value)
          .join('')
        measure(win, 'paste-then-redo-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        editor.command.executeRedo()

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          const layoutText = draw
            .getLayoutMainElementList()
            .map((element: { value?: string }) => element.value || '')
            .join('')
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.completedCount).to.eq(1)
          expect(stats.asyncInsert.status).to.eq('completed')
          expect(stats.asyncInsert.lastFinishReason).to.eq('flush')
          expect(stats.asyncInsert.lastFlushReason).to.eq('command-redo')
          expect(layoutText).to.include('redo-anchor')
        })
      })
    })
  })

  it('flushes a pending large paste transaction before search reads matches', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = `${createLargeDocument(1200)
          .map(element => element.value)
          .join('')}\nsearch-target-after-flush`
        measure(win, 'paste-then-search-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        editor.command.executeSearch('search-target-after-flush')
        const stats = editor.getRenderBackendStats()
        const navigateInfo = editor.command.getSearchNavigateInfo()
        expect(stats.asyncInsert.active).to.eq(false)
        expect(stats.asyncInsert.completedCount).to.eq(1)
        expect(stats.asyncInsert.status).to.eq('completed')
        expect(stats.asyncInsert.lastFinishReason).to.eq('flush')
        expect(stats.asyncInsert.lastFlushReason).to.eq('command-search')
        expect(navigateInfo?.count).to.eq(1)
      })
    })
  })

  it('flushes a pending large paste transaction before HTML and text export read data', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const htmlText = `${createLargeDocument(1200)
          .map(element => element.value)
          .join('')}\nhtml-export-after-flush`
        measure(win, 'paste-then-html-first-batch', () => {
          editor.command.executeInsertElementList([{ value: htmlText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        const html = editor.command.getHTML()
        let stats = editor.getRenderBackendStats()
        expect(html.main).to.include('html-export-after-flush')
        expect(stats.asyncInsert.active).to.eq(false)
        expect(stats.asyncInsert.completedCount).to.eq(1)
        expect(stats.asyncInsert.lastFlushReason).to.eq('command-get-html')

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)
        const textExportText = `${createLargeDocument(1200)
          .map(element => element.value)
          .join('')}\ntext-export-after-flush`
        measure(win, 'paste-then-text-first-batch', () => {
          editor.command.executeInsertElementList([{ value: textExportText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        const text = editor.command.getText()
        stats = editor.getRenderBackendStats()
        expect(text.main).to.include('text-export-after-flush')
        expect(stats.asyncInsert.active).to.eq(false)
        expect(stats.asyncInsert.completedCount).to.eq(1)
        expect(stats.asyncInsert.lastFlushReason).to.eq('command-get-text')
      })
    })
  })

  it('flushes a pending large paste transaction before image export reads pages', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = createLargeDocument(1200)
          .map(element => element.value)
          .join('')
        measure(win, 'paste-then-image-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        cy.wrap(editor.command.getImage()).then((base64List: string[]) => {
          const stats = editor.getRenderBackendStats()
          expect(base64List.length).to.be.greaterThan(1)
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.completedCount).to.eq(1)
          expect(stats.asyncInsert.lastFlushReason).to.eq('get-data-url')
          return countInkPixelsInDataUrl(win, base64List[0]).then(inkPixelCount => {
            expect(inkPixelCount, '导出图片应包含正文像素').to.be.greaterThan(100)
          })
        })
      })
    })
  })

  it('flushes a pending large paste transaction before save emits payload', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        editor.command.executeSetValue(
          {
            header: [],
            main: createLargeDocument(20),
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        editor.command.executeSetRange(10, 10)

        const longText = `${createLargeDocument(1200)
          .map(element => element.value)
          .join('')}\nsaved-after-flush`
        measure(win, 'paste-then-save-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        const savedPayloadList: any[] = []
        editor.listener.saved = (payload: any) => {
          savedPayloadList.push(payload)
        }
        const input = win.document.querySelector(
          '.ce-inputarea'
        ) as HTMLTextAreaElement
        const wasNotCancelled = input.dispatchEvent(
          new win.KeyboardEvent('keydown', {
            key: 's',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
          })
        )

        const stats = editor.getRenderBackendStats()
        expect(wasNotCancelled).to.eq(false)
        expect(savedPayloadList.length).to.eq(1)
        const savedText = savedPayloadList[0].data.main
          .map((element: { value?: string }) => element.value || '')
          .join('')
        expect(savedText).to.include('saved-after-flush')
        expect(stats.asyncInsert.active).to.eq(false)
        expect(stats.asyncInsert.completedCount).to.eq(1)
        expect(stats.asyncInsert.lastFlushReason).to.eq('get-value')
      })
    })
  })

  it('keeps large paste inside table cells on synchronous recovery path', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [{ value: '\u200B' }],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      editor.command.executeSetRange(0, 0)
      editor.command.executeInsertTable(1, 1)
      const table = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find((element: any) => element.type === 'table')
      expect(table?.id).to.be.a('string')
      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table.id,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      })
      editor.command.executeSetRange(0, 0, table.id, 0, 0, 0, 0)
      editor.resetRenderBackendStats()

      const longText = createLargeDocument(1200)
        .map(element => element.value)
        .join('')
      editor.command.executeInsertElementList([{ value: longText }])

      const stats = editor.getRenderBackendStats()
      const nextTable = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find((element: any) => element.type === 'table')
      const cellText = nextTable.trList[0].tdList[0].value
        .map((element: { value?: string }) => element.value || '')
        .join('')
      expect(stats.asyncInsert.startedCount).to.eq(0)
      expect(stats.asyncInsert.active).to.eq(false)
      expect(stats.asyncInsert.syncRecoveryCount).to.eq(1)
      expect(stats.asyncInsert.tableSyncRecoveryCount).to.eq(1)
      expect(stats.asyncInsert.lastSyncRecoveryReason).to.eq('table-context')
      expect(cellText).to.include('performance-page-1199')
    })
  })

  it('keeps large paste inside active controls on synchronous recovery path', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          {
            type: 'control',
            value: '',
            control: {
              type: 'text',
              value: [{ value: '关系' }],
              placeholder: '关系'
            }
          }
        ],
        footer: []
      })
      const elementList = editor.draw.getObjectResolver().getOriginalMainElementList()
      const insertIndex = elementList.findIndex(
        (element: any) => element.value === '关'
      )
      expect(insertIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(insertIndex, insertIndex)
      editor.resetRenderBackendStats()

      const longText = createLargeDocument(1200)
        .map(element => element.value)
        .join('')
      editor.command.executeInsertElementList([{ value: longText }])

      const stats = editor.getRenderBackendStats()
      const textControl = editor.command
        .getValue()
        .data.main.find((element: any) => {
          return element.type === 'control' && element.control?.type === 'text'
        })
      const controlValue = (textControl?.control?.value || [])
        .map((element: { value?: string }) => element.value || '')
        .join('')
      expect(stats.asyncInsert.startedCount).to.eq(0)
      expect(stats.asyncInsert.active).to.eq(false)
      expect(stats.asyncInsert.syncRecoveryCount).to.eq(1)
      expect(stats.asyncInsert.controlSyncRecoveryCount).to.eq(1)
      expect(stats.asyncInsert.lastSyncRecoveryReason).to.eq('control-context')
      expect(controlValue).to.include('performance-page-1199')
    })
  })

  it('keeps large paste inside header and footer on synchronous recovery path', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue(
        {
          headerPageScopes: [
            { pageScope: 'all', elementList: [{ value: 'header-anchor' }] }
          ],
          main: [{ value: 'main-anchor' }],
          footerPageScopes: [
            { pageScope: 'all', elementList: [{ value: 'footer-anchor' }] }
          ]
        },
        {
          isSetCursor: true
        }
      )

      editor.command.executeSetZone(EditorZone.HEADER)
      editor.command.executeSetRange(0, 0)
      editor.resetRenderBackendStats()
      const headerText = `header-large-paste-start ${'h'.repeat(1100)} header-large-paste-end`
      editor.command.executeInsertElementList([{ value: headerText }])
      let stats = editor.getRenderBackendStats()
      let value = editor.command.getValue({ pageNo: 0 })
      let mergedText = value.data.header!
        .map((element: { value?: string }) => element.value || '')
        .join('')
      expect(stats.asyncInsert.startedCount).to.eq(0)
      expect(stats.asyncInsert.active).to.eq(false)
      expect(stats.asyncInsert.syncRecoveryCount).to.eq(1)
      expect(stats.asyncInsert.headerSyncRecoveryCount).to.eq(1)
      expect(stats.asyncInsert.lastSyncRecoveryReason).to.eq('header-context')
      expect(mergedText).to.include('header-large-paste-end')

      editor.command.executeSetZone(EditorZone.FOOTER)
      editor.command.executeSetRange(0, 0)
      editor.resetRenderBackendStats()
      const footerText = `footer-large-paste-start ${'f'.repeat(1100)} footer-large-paste-end`
      editor.command.executeInsertElementList([{ value: footerText }])
      stats = editor.getRenderBackendStats()
      value = editor.command.getValue({ pageNo: 0 })
      mergedText = value.data.footer!
        .map((element: { value?: string }) => element.value || '')
        .join('')
      expect(stats.asyncInsert.startedCount).to.eq(0)
      expect(stats.asyncInsert.active).to.eq(false)
      expect(stats.asyncInsert.syncRecoveryCount).to.eq(1)
      expect(stats.asyncInsert.footerSyncRecoveryCount).to.eq(1)
      expect(stats.asyncInsert.lastSyncRecoveryReason).to.eq('footer-context')
      expect(mergedText).to.include('footer-large-paste-end')
    })
  })
})
