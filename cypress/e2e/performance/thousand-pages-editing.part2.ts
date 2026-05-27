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
  it('records failed status and clears pending transaction when a background batch throws', () => {
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

        const mutationService = draw.getServices().mutationService
        const originalInsertElementList =
          mutationService.insertElementList.bind(mutationService)
        mutationService.insertElementList = (payload: any[], options: any = {}) => {
          if (options.asyncInsertTransactionId && options.isSilentBatch) {
            throw new Error('test async batch failure')
          }
          return originalInsertElementList(payload, options)
        }

        const longText = createLargeDocument(1200)
          .map(element => element.value)
          .join('')
        editor.command.executeInsertElementList([{ value: longText }])
        expect(editor.getRenderBackendStats().asyncInsert.active).to.eq(true)

        cy.on('uncaught:exception', error => {
          if (error.message.includes('test async batch failure')) {
            return false
          }
        })

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const stats = editor.getRenderBackendStats()
          expect(stats.asyncInsert.active).to.eq(false)
          expect(stats.asyncInsert.status).to.eq('failed')
          expect(stats.asyncInsert.lastErrorReason).to.eq(
            'test async batch failure'
          )
          expect(stats.asyncInsert.pendingBatchCount).to.eq(0)
          expect(stats.asyncInsert.lastFirstBatchDurationMs).to.be.greaterThan(0)
        }).then(() => {
          mutationService.insertElementList = originalInsertElementList
          editor.command.executeInsertElementList([
            { value: 'after-failure-input' }
          ])
          const value = editor.command.getValue()
          const text = value.data.main
            .map((element: { value?: string }) => element.value || '')
            .join('')
          const stats = editor.getRenderBackendStats()
          expect(stats.asyncInsert.active).to.eq(false)
          expect(text).to.include('after-failure-input')
        })
      })
    })
  })

  it('keeps unicode grapheme boundaries when batching a large pasted text element', () => {
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

        const familyEmoji = '👨‍👩‍👧‍👦'
        const skinToneEmoji = '👍🏽'
        const flagEmoji = '🇨🇳'
        const tagFlagEmoji = String.fromCodePoint(
          0x1f3f4,
          0xe0067,
          0xe0062,
          0xe0065,
          0xe006e,
          0xe0067,
          0xe007f
        )
        const combiningText = 'Cafe\u0301'
        const longText =
          'a'.repeat(499) +
          familyEmoji +
          'b'.repeat(497) +
          skinToneEmoji +
          'c'.repeat(498) +
          flagEmoji +
          'd'.repeat(498) +
          tagFlagEmoji +
          combiningText +
          '\nunicode-boundary-end'

        measure(win, 'paste-unicode-boundary-first-batch', () => {
          editor.command.executeInsertElementList([{ value: longText }])
        })

        cy.wrap(null, { timeout: 20000 }).should(() => {
          const layoutText = draw
            .getLayoutMainElementList()
            .map((element: { value?: string }) => element.value || '')
            .join('')
          expect(layoutText).to.include(familyEmoji)
          expect(layoutText).to.include(skinToneEmoji)
          expect(layoutText).to.include(flagEmoji)
          expect(layoutText).to.include(tagFlagEmoji)
          expect(layoutText).to.include(combiningText)
          expect(layoutText).to.include('unicode-boundary-end')
          const stats = editor.getRenderBackendStats()
          expect(stats.asyncInsert.completedCount).to.eq(1)
          expect(stats.asyncInsert.lastFinalLayoutDurationMs).to.be.greaterThan(0)
        })
      })
    })
  })
})