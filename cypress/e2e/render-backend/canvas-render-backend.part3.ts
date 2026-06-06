import { TextDecorationStyle } from '../../../src/editor/dataset/enum/Text'
import {
  BackgroundRepeat,
  BackgroundSize
} from '../../../src/editor/dataset/enum/Background'
import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'

type CanvasPixelStats = {
  nonWhite: number
  blackish: number
  total: number
}

type RenderBackendTestStats = {
  baseRenderSource: {
    canvas2DRenderCount: number
    workerRenderCount: number
    bitmapCacheComposeCount: number
    lastSourceByPageNo: Record<number, string>
    recentWindow: {
      sampleCount: number
      sourceCountMap: Record<string, number>
      sampleList: Array<{
        pageNo: number
        source: string
      }>
    }
  }
  surface: {
    bitmapCache: {
      count: number
      setCount: number
      hitCount: number
      missCount: number
      composeHitCount: number
      composeRejectCount: number
      setCountBySource: Record<string, number>
      hitCountBySource: Record<string, number>
      composeHitCountBySource: Record<string, number>
      recentWindow: {
        sampleCount: number
        sourceCountMap: Record<string, number>
      }
    }
  }
  canvasPool: {
    acquireCount: number
    releaseCount: number
    hitCount: number
    hitRate: number
    idleCount: number
  }
  imagePreview: {
    count: number
    maxCount: number
    setCount: number
    hitCount: number
    missCount: number
    hitRate: number
    evictCount: number
    estimatedBytes: number
    estimatedMB: number
    peakEstimatedBytes: number
    peakEstimatedMB: number
    estimatedSavedRenderPixels: number
  }
  backend: {
    dispatchCount: number
    renderCount: number
    missCount: number
    failureCount: number
    fallbackCount: number
    capabilityList: Array<{
      name: string
      supported?: boolean
      enabled?: boolean
      textureCacheSize?: number
      maxTextureCacheSize?: number
      textureCacheBytes?: number
      textureCacheMB?: number
      maxTextureCacheBytes?: number
      maxTextureCacheMB?: number
      textureUploadCount?: number
      textureReuseCount?: number
      textureEvictCount?: number
      textureBudgetEvictCount?: number
      filterApplyCount?: number
      downsampleRenderCount?: number
      cropRenderCount?: number
      rotationRenderCount?: number
      originalSourcePixels?: number
      outputPixels?: number
      savedUploadPixels?: number
      estimatedDownsampleSavedPixels?: number
    }>
    backendHitCountMap: Record<string, number>
    backendFailureCountMap: Record<string, number>
    backendFallbackCountMap: Record<string, number>
    taskStats: {
      dispatchCountByLayer: Record<string, number>
      dispatchCountByReason: Record<string, number>
      dispatchCountByPriority: Record<string, number>
      renderCountByLayer: Record<string, number>
      renderCountByReason: Record<string, number>
      renderCountByPriority: Record<string, number>
    }
    pageEngineStatsList: Array<{
      pageNo: number
      layer: string
      lastPriority: string
      lastBackendName?: string
      lastFallback: boolean
      lastFailedBackendNameList: string[]
      lastRendered: boolean
      renderCount: number
      missCount: number
      failureCount: number
      fallbackCount: number
    }>
    recentWindow: {
      sampleCount: number
      renderCount: number
      missCount: number
      failureCount: number
      fallbackCount: number
      backendFailureCountMap: Record<string, number>
      backendFallbackCountMap: Record<string, number>
      slowCount: number
    }
  }
  workerRender: {
    submitCount: number
    successCount: number
    fallbackCount: number
    staleDiscardCount: number
    composeRejectCount: number
    timeoutCount: number
    cancelCount: number
    queueDropCount: number
    priorityReorderCount: number
    circuitOpenCount: number
    lastFallbackReason: string
    pendingCount: number
    activeCount: number
    queuedCount: number
    maxConcurrent: number
    maxQueueLength: number
    consecutiveFailureCount: number
    circuitOpen: boolean
  }
  tableSnapshot: {
    build: {
      buildCount: number
      lastDuration: number
    }
  }
  memory: {
    estimatedTotalBytes: number
    estimatedTotalMB: number
    activeSurfaceBytes: number
    bitmapCacheBytes: number
    imagePreviewBitmapBytes: number
    idleCanvasPoolBytes: number
    peakActiveSurfaceBytes: number
  }
}

const TEST_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSIzMCI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjUyIiBoZWlnaHQ9IjIyIiBmaWxsPSIjMTExIi8+PHRleHQgeD0iMTIiIHk9IjIxIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmIj5JTUc8L3RleHQ+PC9zdmc+'

const TEST_PNG_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAdSURBVChTY2BgYPivoaHxHyeNVRCJZsAmOORMAABGQE7BX0fKjAAAAABJRU5ErkJggg=='

const TEST_BACKGROUND_IMAGE =
  TEST_PNG_IMAGE

const TEST_SVG_BLOCK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 72"><rect width="180" height="72" fill="#fff3bf"/><circle cx="44" cy="36" r="24" fill="#1971c2"/><path d="M84 18h72v12H84zM84 42h52v12H84z" fill="#2b8a3e"/></svg>'

/** 读取 canvas 像素分布，用于判断浏览器真实渲染是否空白或整页黑屏。 */
function readCanvasPixelStats(canvas: HTMLCanvasElement): CanvasPixelStats {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('canvas 2d context not found')
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let nonWhite = 0
  let blackish = 0
  for (let index = 0; index < image.length; index += 4) {
    const r = image[index]
    const g = image[index + 1]
    const b = image[index + 2]
    const a = image[index + 3]
    if (a > 0 && (r < 250 || g < 250 || b < 250)) {
      nonWhite++
    }
    if (a > 0 && r < 16 && g < 16 && b < 16) {
      blackish++
    }
  }
  return {
    nonWhite,
    blackish,
    total: image.length / 4
  }
}

/** 生成多页文本数据，触发可视页绘制、bitmap 写入和 canvas 池复用。 */
function createLargeDocument(lineCount: number) {
  return Array.from({ length: lineCount }, (_, index) => ({
    value: `canvas-render-backend-line-${index} 自动化浏览器测试内容，用于验证 canvas 池、bitmap 缓存和渲染后端统计。\n`
  }))
}

/** 创建包含列表、控件、表格和图片的 worker 覆盖文档。 */
function createCoreWorkerDocument() {
  return [
    {
      value: 'worker-core-intro\n'
    },
    {
      value: '列表第一项\n列表第二项\n'
    },
    {
      value: '控件：'
    },
    {
      type: 'checkbox',
      checkbox: {
        value: true
      },
      value: ''
    },
    {
      value: ' '
    },
    {
      type: 'radio',
      radio: {
        value: true
      },
      value: ''
    },
    {
      value: '\n图片：'
    },
    {
      type: 'image',
      value: TEST_IMAGE,
      width: 60,
      height: 30
    },
    {
      value: '\n表格：\n'
    },
    {
      id: 'worker-core-table',
      type: 'table',
      value: '',
      width: 360,
      colgroup: [{ width: 120 }, { width: 120 }, { width: 120 }],
      borderType: 'all',
      borderColor: '#111111',
      borderWidth: 1,
      trList: Array.from({ length: 6 }, (_, rowIndex) => ({
        height: 38,
        minHeight: 38,
        tdList: Array.from({ length: 3 }, (_, colIndex) => ({
          colspan: 1,
          rowspan: 1,
          backgroundColor:
            rowIndex === 0 || colIndex === 0 ? '#f0f0f0' : undefined,
          value: [
            {
              value: `R${rowIndex + 1}C${colIndex + 1}`
            }
          ]
        }))
      }))
    },
    ...createLargeDocument(120)
  ]
}

/** 创建非当前页浮动图片文档，验证浮动图不再触发 worker 快照回退。 */
function createFloatingImageWorkerDocument() {
  return [
    ...createLargeDocument(140),
    {
      value: 'worker-floating-image-anchor '
    },
    {
      id: 'worker-floating-image-target',
      type: 'image',
      value: TEST_PNG_IMAGE,
      width: 64,
      height: 64,
      imgDisplay: ImageDisplay.FLOAT_TOP,
      imgFloatPosition: {
        x: 128,
        y: 180
      }
    },
    {
      value: '浮动图片正文续写\n'
    },
    ...createLargeDocument(80)
  ]
}

/** 创建非当前页编辑辅助标记文档，覆盖 line break 和 page break worker 命令化。 */
function createAssistiveMarkerWorkerDocument() {
  return [
    ...createLargeDocument(120),
    {
      value: 'worker-assistive-marker-before\n'
    },
    {
      id: 'worker-page-break-marker',
      type: 'pageBreak',
      value: ''
    },
    {
      value: 'worker-assistive-marker-after\n'
    },
    ...createLargeDocument(60)
  ]
}

/** 创建含 TAB 与分散 / 两端对齐文本的 worker 文档。 */
function createTabAndJustifiedWorkerDocument() {
  return [
    ...createLargeDocument(120),
    {
      id: 'worker-justify-anchor',
      value: 'worker-justify-anchor ',
      rowFlex: RowFlex.ALIGNMENT
    },
    {
      type: 'tab',
      value: '\t'
    },
    {
      value: 'alignment text stretches when line width is not enough',
      rowFlex: RowFlex.ALIGNMENT
    },
    {
      value: '\n'
    },
    {
      value: 'worker justify first part ',
      rowFlex: RowFlex.JUSTIFY
    },
    {
      value: 'worker justify second part fills available line width',
      rowFlex: RowFlex.JUSTIFY
    },
    {
      value: '\n'
    },
    ...createLargeDocument(60)
  ]
}

/** 创建包裹 group / area / control 的非文本元素 worker 文档。 */
function createStyledNonTextWorkerDocument() {
  const areaId = 'worker-styled-non-text-area'
  const groupId = 'worker-styled-non-text-group'
  const controlId = 'worker-styled-non-text-control'
  return [
    ...createLargeDocument(120),
    {
      id: 'worker-styled-non-text-anchor',
      type: 'checkbox',
      value: '',
      checkbox: {
        value: true
      },
      groupIds: [groupId]
    },
    {
      value: ' grouped control '
    },
    {
      type: 'image',
      value: TEST_PNG_IMAGE,
      width: 48,
      height: 48,
      groupIds: [groupId],
      areaId,
      area: {
        backgroundColor: '#e7f5ff',
        borderColor: '#1971c2'
      }
    },
    {
      value: '\n'
    },
    {
      type: 'separator',
      value: '',
      groupIds: [groupId],
      controlId,
      control: {
        border: true
      }
    },
    {
      value: '\n'
    },
    {
      id: 'worker-styled-non-text-table',
      type: 'table',
      value: '',
      width: 240,
      colgroup: [{ width: 120 }, { width: 120 }],
      borderType: 'all',
      borderColor: '#495057',
      borderWidth: 1,
      groupIds: [groupId],
      controlId,
      control: {
        border: true
      },
      trList: Array.from({ length: 2 }, (_, rowIndex) => ({
        height: 34,
        minHeight: 34,
        tdList: Array.from({ length: 2 }, (_, colIndex) => ({
          colspan: 1,
          rowspan: 1,
          backgroundColor: rowIndex === 0 ? '#fff3bf' : undefined,
          value: [
            {
              value: `S${rowIndex + 1}${colIndex + 1}`
            }
          ]
        }))
      }))
    },
    {
      value: '\n'
    },
    ...createLargeDocument(60)
  ]
}

/** 创建 LaTeX worker 覆盖文档。 */
function createLaTexWorkerDocument() {
  return [
    ...createLargeDocument(120),
    {
      id: 'worker-latex-anchor',
      value: 'worker-latex-anchor '
    },
    {
      type: 'latex',
      value: 'x^2+y^2=z^2'
    },
    {
      value: '\n'
    },
    ...createLargeDocument(60)
  ]
}

/** 创建覆盖高亮、下划线和删除线的 worker 样式文档。 */
function createStyledWorkerDocument(lineCount: number) {
  return Array.from({ length: lineCount }, (_, index) => [
    {
      value: `样式高亮-${index} `,
      highlight: index % 2 === 0 ? '#fff3bf' : '#d8f5a2'
    },
    {
      value: `下划线-${index} `,
      underline: true,
      color: '#0b7285',
      textDecoration: {
        style:
          index % 3 === 0
            ? TextDecorationStyle.WAVY
            : index % 3 === 1
              ? TextDecorationStyle.DOUBLE
              : TextDecorationStyle.DASHED
      }
    },
    {
      value: `删除线-${index}\n`,
      strikeout: true,
      color: '#862e9c'
    }
  ]).flat()
}

/** 创建覆盖更复杂文本排版类型的 worker 文档。 */
function createAdvancedTextWorkerDocument(lineCount: number) {
  return Array.from({ length: lineCount }, (_, index) => [
    {
      value: `高级文本-${index} H`
    },
    {
      type: 'superscript',
      value: '2'
    },
    {
      value: 'O'
    },
    {
      type: 'subscript',
      value: '2'
    },
    {
      value: ' '
    },
    {
      type: 'hyperlink',
      hyperlinkId: `worker-link-${index}`,
      url: 'https://example.com',
      value: '链接'
    },
    {
      value: ' '
    },
    {
      type: 'date',
      dateId: `worker-date-${index}`,
      dateFormat: 'yyyy-MM-dd',
      value: '2026-05-18'
    },
    {
      value: ' '
    },
    {
      value: '宽',
      width: 22
    },
    {
      value: '距',
      letterSpacing: 8
    },
    {
      value: '\n'
    }
  ]).flat()
}

/** 创建包含 area 静态装饰和 group 行内装饰的 worker 文档。 */
function createAreaGroupWorkerDocument(lineCount: number) {
  const areaId = 'worker-area-static'
  return Array.from({ length: lineCount }, (_, index) => [
    {
      value: `区域组-${index} `,
      areaId,
      area:
        index === 0
          ? {
              backgroundColor: '#fff9db',
              borderColor: '#f08c00'
            }
          : undefined
    },
    {
      value: '分组A',
      areaId,
      groupIds: [`worker-group-${Math.floor(index / 6)}`]
    },
    {
      value: ' 分组B',
      areaId,
      groupIds: [`worker-group-${Math.floor(index / 6)}`]
    },
    {
      value: '\n',
      areaId
    }
  ]).flat()
}

/** 创建跨页活动 group 文档，验证非当前页同组内容仍可由 worker 绘制活动态背景。 */
function createActiveGroupWorkerDocument(lineCount: number) {
  const activeGroupId = 'worker-group-active-cross-page'
  return Array.from({ length: lineCount }, (_, index) => [
    {
      value: `活动组-${index} `
    },
    {
      value: 'ACTIVE_A',
      groupIds: [activeGroupId]
    },
    {
      value: ' ACTIVE_B',
      groupIds: [activeGroupId]
    },
    {
      value: '\n'
    }
  ]).flat()
}

/** 创建包含隐藏 area、隐藏元素和隐藏控件的 worker 文档。 */
function createHiddenAreaWorkerDocument(lineCount: number) {
  const hiddenAreaId = 'worker-area-hidden'
  return [
    ...createLargeDocument(80),
    ...Array.from({ length: lineCount }, (_, index) => [
      {
        value: `隐藏区前景-${index} `
      },
      {
        value: `HIDDEN_AREA_${index}`,
        areaId: hiddenAreaId,
        area:
          index === 0
            ? {
                hide: true,
                backgroundColor: '#ffe3e3',
                borderColor: '#c92a2a'
              }
            : undefined
      },
      {
        value: 'HIDDEN_ELEMENT',
        hide: true
      },
      {
        value: 'HIDDEN_CONTROL',
        control: {
          hide: true,
          border: true
        }
      },
      {
        value: ' 可见尾部\n'
      }
    ]).flat()
  ]
}

/** 创建覆盖外框加粗、虚线、斜线和显式单元格边框的 worker 表格文档。 */
function createComplexTableWorkerDocument() {
  return [
    ...createLargeDocument(80),
    {
      value: '复杂表格装饰：\n'
    },
    {
      id: 'worker-complex-table-external',
      type: 'table',
      value: '',
      width: 360,
      colgroup: [{ width: 120 }, { width: 120 }, { width: 120 }],
      borderType: 'all',
      borderColor: '#495057',
      borderWidth: 1,
      borderExternalWidth: 4,
      trList: Array.from({ length: 5 }, (_, rowIndex) => ({
        height: 36,
        minHeight: 36,
        tdList: Array.from({ length: 3 }, (_, colIndex) => ({
          colspan: 1,
          rowspan: 1,
          backgroundColor:
            rowIndex === 0
              ? '#e7f5ff'
              : colIndex === 0
                ? '#f8f9fa'
                : undefined,
          borderTypes:
            rowIndex === 1 && colIndex === 1 ? ['top', 'right', 'bottom', 'left'] : undefined,
          borderColor: rowIndex === 1 && colIndex === 1 ? '#d9480f' : undefined,
          borderWidth: rowIndex === 1 && colIndex === 1 ? 3 : undefined,
          slashTypes: rowIndex === 0 && colIndex === 0 ? ['forward', 'back'] : undefined,
          value: [
            {
              value: `E${rowIndex + 1}${colIndex + 1}`
            }
          ]
        }))
      }))
    },
    {
      value: '\n'
    },
    {
      id: 'worker-complex-table-dash',
      type: 'table',
      value: '',
      width: 300,
      colgroup: [{ width: 100 }, { width: 100 }, { width: 100 }],
      borderType: 'dash',
      borderColor: '#1864ab',
      borderWidth: 1,
      trList: Array.from({ length: 4 }, (_, rowIndex) => ({
        height: 34,
        minHeight: 34,
        tdList: Array.from({ length: 3 }, (_, colIndex) => ({
          colspan: 1,
          rowspan: 1,
          backgroundColor:
            rowIndex === colIndex ? '#fff3bf' : undefined,
          slashTypes: rowIndex === 2 && colIndex === 2 ? ['forward'] : undefined,
          value: [
            {
              value: `D${rowIndex + 1}${colIndex + 1}`
            }
          ]
        }))
      }))
    },
    ...createLargeDocument(120)
  ]
}

/** 获取内部 Draw 实例，专项测试需要读取新增的渲染后端统计入口。 */
function getDraw(editor: any) {
  const draw = editor.draw || Reflect.get(editor, 'draw')
  if (!draw) {
    throw new Error('draw instance not found')
  }
  return draw
}

/** 获取公开渲染统计入口，验证业务侧可直接读取监控数据。 */
function getRenderBackendStats(editor: any): RenderBackendTestStats {
  return editor.getRenderBackendStats() as RenderBackendTestStats
}

function getRenderBackendDebugSnapshot(editor: any): any {
  return editor.getRenderBackendDebugSnapshot()
}

/** 获取当前视口真实挂载的第一个 base canvas。 */
function getFirstMountedBaseCanvas(doc: Document): HTMLCanvasElement {
  const canvas = doc.querySelector('canvas[data-index]') as HTMLCanvasElement | null
  if (!canvas) {
    throw new Error('mounted base canvas not found')
  }
  return canvas
}

/** 绕过 Draw.render 的非布局版本推进，直接重放指定页渲染以验证 bitmap cache 合成。 */
function redrawPageWithoutInvalidatingBaseBitmap(draw: any, pageNo: number) {
  draw.getServices().pageRenderer.drawPage({
    elementList: draw.getLayoutMainElementList(),
    positionList: draw.getCoordinate().getMainPositionList(),
    rowList: draw.getPageRowList()[pageNo],
    pageNo
  })
}

function waitForBitmapCacheReady(editor: any) {
  cy.wrap(null, { timeout: 10000 }).should(() => {
    const stats = getRenderBackendStats(editor)
    expect(stats.surface.bitmapCache.count, 'bitmap cache 当前数量').to.be.greaterThan(0)
    expect(stats.surface.bitmapCache.setCount, 'bitmap cache 写入次数').to.be.greaterThan(0)
  })
}

function readDataUrlPixelStats(win: Window, dataUrl: string): Cypress.Chainable<CanvasPixelStats> {
  return cy.wrap(
    new Cypress.Promise<CanvasPixelStats>((resolve, reject) => {
      const image = new win.Image()
      image.onload = () => {
        const canvas = win.document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('export canvas 2d context not found'))
          return
        }
        ctx.drawImage(image, 0, 0)
        resolve(readCanvasPixelStats(canvas))
      }
      image.onerror = reject
      image.src = dataUrl
    })
  )
}

function renderVisiblePages(draw: any, extraPageNoList: number[]) {
  draw.enqueueExtraVisibleRenderPages(extraPageNoList)
  draw.render({
    isCompute: false,
    isSubmitHistory: false,
    isSetCursor: false,
    isLazy: false,
    pageRenderScope: 'visible'
  })
}

/** 注册一个只接 worker base 任务的测试后端，用于验证灰度优先级。 */
function registerWorkerProbe(draw: any) {
  draw.getServices().renderBackendManager.register(
    {
      name: 'worker-probe',
      getCapability: () => ({
        supported: true,
        enabled: true
      }),
      canRender: (task: any) => {
        return (
          task.layer === 'base' &&
          task.reason === 'base-visible' &&
          task.priority === 'worker' &&
          !task.isCurrentPage &&
          !task.isInteractive
        )
      },
      render: (surface: any, task: any) => {
        task.execute?.(surface, task)
      }
    },
    {
      priority: 'first'
    }
  )
}

describe('canvas 池与渲染后端浏览器级回归', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })
  it('非当前默认装饰页可命中真实 OffscreenCanvas worker 并合成回 base', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.header.disabled = false
      options.footer.disabled = false
      options.pageNumber.disabled = false
      options.watermark.data = 'CANVAS-EDITOR'
      options.watermark.repeat = false
      options.lineNumber.disabled = true
      options.pageBorder.disabled = true
      options.renderBackend.offscreenCanvas.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(140),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(600)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(1)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.disconnectLazyRender()
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      draw.getPageCanvasHost().mountCanvas(1)
      editor.resetRenderBackendStats()
      draw.getServices().pageRenderer.drawPage({
        elementList: draw.getLayoutMainElementList(),
        positionList: draw.getCoordinate().getMainPositionList(),
        rowList: draw.getPageRowList()[1],
        pageNo: 1
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.successCount, 'worker 成功次数').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, 'worker 合成后 base canvas 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const workerBaseStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === 1 && item.layer === 'base'
      })

      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '真实 worker 后端命中').to.be.greaterThan(0)
      expect(stats.workerRender.submitCount, 'worker 提交次数').to.be.greaterThan(0)
      expect(stats.workerRender.fallbackCount, 'worker fallback 次数').to.eq(0)
      expect(stats.workerRender.composeRejectCount, 'worker 合成拒绝次数').to.eq(0)
      expect(stats.workerRender.pendingCount, 'worker pending 清空').to.eq(0)
      expect(stats.workerRender.activeCount, 'worker active 清空').to.eq(0)
      expect(stats.workerRender.queuedCount, 'worker queue 清空').to.eq(0)
      expect(stats.workerRender.queueDropCount, 'worker 队列丢弃次数').to.eq(0)
      expect(stats.workerRender.circuitOpen, 'worker 熔断状态').to.eq(false)
      expect(
        stats.baseRenderSource.workerRenderCount,
        'base 来源统计记录 worker 合成'
      ).to.be.greaterThan(0)
      expect(
        stats.baseRenderSource.lastSourceByPageNo[1],
        '非当前页最近来源为 worker'
      ).to.eq('worker-render')
      expect(
        stats.surface.bitmapCache.setCountBySource['worker-render'],
        'bitmap cache 写入来源包含 worker'
      ).to.be.greaterThan(0)
      expect(workerBaseStats?.lastBackendName, '非当前页 base 后端').to.eq('offscreen-canvas')
      expect(workerBaseStats?.lastPriority, '非当前页 base 优先级').to.eq('worker')
    })
  })
})