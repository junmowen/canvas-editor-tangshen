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
    positionList: draw.getPosition().getLayoutMainPositionList(),
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

  it('真实浏览器渲染非空、非整页黑屏，并输出后端调度统计', () => {
    cy.getEditor().then((editor: any) => {
      editor.resetRenderBackendStats()
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(80),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(1000)

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      // 非白像素过少通常意味着 base canvas 没有真实绘制正文。
      expect(pixelStats.nonWhite, 'base canvas 非白像素').to.be.greaterThan(500)
      // 整页黑屏会导致黑色像素占比异常升高。
      expect(
        pixelStats.blackish / pixelStats.total,
        'base canvas 黑色像素占比'
      ).to.be.lessThan(0.25)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.dispatchCount, '渲染调度次数').to.be.greaterThan(0)
      expect(stats.backend.renderCount, '成功渲染次数').to.be.greaterThan(0)
      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
      expect(stats.backend.failureCount, '后端失败次数').to.eq(0)
      expect(stats.backend.fallbackCount, '后端回退次数').to.eq(0)
      const capabilityMap = Object.fromEntries(
        stats.backend.capabilityList.map(item => [item.name, item])
      )
      expect(capabilityMap['offscreen-canvas']?.enabled, 'OffscreenCanvas 默认关闭').to.eq(false)
      expect(capabilityMap.webgl?.enabled, 'WebGL 默认关闭').to.eq(false)
      expect(capabilityMap['svg-dom']?.enabled, 'SVG/DOM 默认关闭').to.eq(false)
      expect(stats.backend.recentWindow.sampleCount, '近期调度样本').to.be.greaterThan(0)
      expect(stats.backend.recentWindow.missCount, '近期未命中次数').to.eq(0)
      expect(stats.backend.pageEngineStatsList.length, '每页 engine 状态').to.be.greaterThan(0)
      expect(
        stats.baseRenderSource.canvas2DRenderCount,
        '同步 Canvas2D base 来源次数'
      ).to.be.greaterThan(0)
      expect(
        stats.baseRenderSource.recentWindow.sourceCountMap['canvas-2d-render'],
        '近期 base 来源包含 Canvas2D'
      ).to.be.greaterThan(0)
      expect(
        stats.backend.pageEngineStatsList.some(
          item =>
            item.layer === 'base' &&
            item.lastRendered &&
            item.lastBackendName === 'canvas-2d'
        ),
        'base 层命中 canvas-2d engine'
      ).to.eq(true)
      expect(stats.memory.estimatedTotalBytes, '总 backing store 估算内存').to.be.greaterThan(0)
    })
  })

  it('非当前页 base 可进入 worker 优先级，当前页和 overlay 保持同步路径', () => {
    cy.getEditor().then((editor: any) => {
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

    cy.wait(1000)

    cy.getEditor().then((editor: any) => {
      waitForBitmapCacheReady(editor)
    })

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const pageCount = draw.getPageRowList().length
      expect(pageCount, '分页页数').to.be.greaterThan(1)
      const nonCurrentPageNo = 1
      draw.getRuntime().getOptions().renderBackend.offscreenCanvas.enabled = true
      registerWorkerProbe(draw)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([nonCurrentPageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(600)

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const currentBaseStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === 0 && item.layer === 'base'
      })
      const nonCurrentBaseStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === 1 && item.layer === 'base'
      })
      const overlayStats = stats.backend.pageEngineStatsList.filter(item => {
        return item.layer === 'overlay'
      })

      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['worker-probe'], 'worker probe 命中次数').to.be.greaterThan(0)
      expect(currentBaseStats?.lastBackendName, '当前页 base 后端').to.eq('canvas-2d')
      expect(currentBaseStats?.lastPriority, '当前页 base 优先级').to.eq('sync')
      expect(nonCurrentBaseStats?.lastBackendName, '非当前页 base 后端').to.eq('worker-probe')
      expect(nonCurrentBaseStats?.lastPriority, '非当前页 base 优先级').to.eq('worker')
      expect(
        overlayStats.every(item => {
          return item.lastBackendName === 'overlay-2d' && item.lastPriority === 'sync'
        }),
        'overlay 保持 overlay-2d sync'
      ).to.eq(true)
    })
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
        positionList: draw.getPosition().getLayoutMainPositionList(),
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

  it('非当前带背景图页面可命中真实 OffscreenCanvas worker 并合成回 base', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.header.disabled = true
      options.footer.disabled = true
      options.pageNumber.disabled = true
      options.watermark.data = ''
      options.lineNumber.disabled = true
      options.pageBorder.disabled = true
      options.background.color = '#fafafa'
      options.background.image = TEST_BACKGROUND_IMAGE
      options.background.size = BackgroundSize.COVER
      options.background.repeat = BackgroundRepeat.NO_REPEAT
      options.background.applyPageNumbers = [1]
      options.renderBackend.offscreenCanvas.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(160),
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
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      draw.getPageCanvasHost().mountCanvas(1)
      editor.resetRenderBackendStats()
      draw.getServices().pageRenderer.drawPage({
        elementList: draw.getLayoutMainElementList(),
        positionList: draw.getPosition().getLayoutMainPositionList(),
        rowList: draw.getPageRowList()[1],
        pageNo: 1
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.successCount, '背景图 worker 成功次数').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const workerBaseStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === 1 && item.layer === 'base'
      })
      expect(stats.backend.missCount, '背景图 worker 场景未命中次数').to.eq(0)
      expect(stats.backend.failureCount, '背景图 worker 场景失败次数').to.eq(0)
      expect(stats.backend.fallbackCount, '背景图 worker 场景回退次数').to.eq(0)
      expect(stats.workerRender.fallbackCount, '背景图 worker fallback 次数').to.eq(0)
      expect(
        stats.backend.backendHitCountMap['offscreen-canvas'],
        '背景图页命中真实 worker'
      ).to.be.greaterThan(0)
      expect(workerBaseStats?.lastBackendName, '背景图页后端').to.eq('offscreen-canvas')
      expect(workerBaseStats?.lastPriority, '背景图页优先级').to.eq('worker')
      expect(
        stats.baseRenderSource.lastSourceByPageNo[1],
        '背景图页最近来源为 worker'
      ).to.eq('worker-render')
      expect(
        stats.surface.bitmapCache.setCountBySource['worker-render'],
        '背景图 worker 结果写入 bitmap cache'
      ).to.be.greaterThan(0)
    })
  })

  it('同页重复 worker 调度只保留最新任务，避免旧排队任务覆盖页面', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.header.disabled = false
      options.footer.disabled = false
      options.pageNumber.disabled = false
      options.watermark.data = 'CANVAS-EDITOR'
      options.watermark.repeat = false
      options.renderBackend.offscreenCanvas.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(180),
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
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      draw.getServices().workerRenderScheduler.dispose()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
      draw.enqueueExtraVisibleRenderPages([1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.successCount, 'worker 成功次数').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
      expect(stats.workerRender.submitCount, 'worker 提交次数').to.be.greaterThan(1)
      expect(stats.workerRender.cancelCount, '旧排队任务取消次数').to.be.greaterThan(0)
      expect(stats.workerRender.pendingCount, 'worker pending 清空').to.eq(0)
      expect(stats.workerRender.queuedCount, 'worker queue 清空').to.eq(0)
      expect(stats.workerRender.circuitOpen, 'worker 不应熔断').to.eq(false)
      const workerBaseStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === 1 && item.layer === 'base'
      })
      expect(workerBaseStats?.lastBackendName, '最终非当前页 base 后端').to.eq('offscreen-canvas')
    })
  })

  it('worker 队列按滚动方向优先处理前方可视页', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(260),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(4)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.setIntersectionPageNo(1)
      draw.setVisiblePageNoList([1, 2, 3, 4])
      draw.setIntersectionPageNo(3)
      draw.setVisiblePageNoList([1, 2, 3, 4])
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([1, 2, 3, 4])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.successCount, 'worker 成功次数').to.be.greaterThan(1)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const workerSourceSamples =
        stats.baseRenderSource.recentWindow.sampleList.filter(sample => {
          return sample.source === 'worker-render'
        })
      expect(stats.workerRender.priorityReorderCount, 'worker 队列重排次数').to.be.greaterThan(0)
      expect(
        workerSourceSamples[1]?.pageNo,
        '首个已激活任务后，滚动方向上的页面应优先合成'
      ).to.eq(3)
      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
    })
  })

  it('重复文字水印可命中真实 OffscreenCanvas worker，不再回退 Canvas2D', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = 'CANVAS-EDITOR'
      options.watermark.repeat = true
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
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(600)

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, 'worker 合成后 base canvas 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
      expect(stats.workerRender.successCount, '重复文字水印 worker 成功').to.be.greaterThan(0)
      expect(stats.workerRender.fallbackCount, '重复文字水印 worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '真实 worker 后端命中').to.be.greaterThan(0)
    })
  })

  it('图片水印可命中真实 OffscreenCanvas worker，不再回退 Canvas2D', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.type = 'image'
      options.watermark.data = TEST_PNG_IMAGE
      options.watermark.width = 24
      options.watermark.height = 24
      options.watermark.repeat = true
      options.watermark.gap = [16, 16]
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

    cy.wait(1000)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(1)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      draw.getServices().workerRenderScheduler.dispose()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '图片水印 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `图片水印 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '图片水印 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '图片水印 worker 合成后 base 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
      expect(stats.workerRender.fallbackCount, '图片水印 worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '真实 worker 后端命中').to.be.greaterThan(0)
    })
  })

  it('空文档占位符页可进入真实 worker 快照', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      options.placeholder.data = '请输入病历内容'
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: ''
            }
          ],
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
      expect(draw.getPageRowList().length, '空文档分页页数').to.eq(1)
      draw.setPageNo(1)
      draw.getRange().setRange(-1, -1)
      draw.getPosition().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      draw.getServices().workerRenderScheduler.dispose()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([0])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '占位符 worker 提交').to.be.greaterThan(0)
        expect(stats.workerRender.successCount, '占位符 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '占位符 worker 合成后 base 非白像素').to.be.greaterThan(50)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '占位符不产生后端 miss').to.eq(0)
      expect(stats.workerRender.fallbackCount, '占位符 worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '占位符真实 worker 后端命中').to.be.greaterThan(0)
    })
  })

  it('文档签章可进入真实 worker 快照，不再回退 Canvas2D', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
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
      editor.command.executeSetMainBadge({
        value: TEST_PNG_IMAGE,
        width: 24,
        height: 24,
        left: 40,
        top: 16
      })
    })

    cy.wait(1000)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(1)
      draw.setPageNo(1)
      draw.getRange().setRange(-1, -1)
      draw.getPosition().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      draw.getServices().workerRenderScheduler.dispose()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([0])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '签章 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `签章 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '签章 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '签章 worker 合成后 base 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '签章不产生后端 miss').to.eq(0)
      expect(stats.workerRender.fallbackCount, '签章 worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '签章真实 worker 后端命中').to.be.greaterThan(0)
    })
  })

  it('高亮、下划线和删除线正文样式可进入真实 worker 快照', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      editor.command.executeSetValue(
        {
          header: [],
          main: createStyledWorkerDocument(140),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(1)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPosition().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '样式 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `样式 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '样式 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '样式 worker 合成后 base 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '样式不产生后端 miss').to.eq(0)
      expect(stats.workerRender.fallbackCount, '样式 worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '样式真实 worker 后端命中').to.be.greaterThan(0)
    })
  })

  it('上标下标、超链接、日期和自定义字距可进入真实 worker 快照', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      editor.command.executeSetValue(
        {
          header: [],
          main: createAdvancedTextWorkerDocument(140),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(1)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPosition().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '高级文本 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `高级文本 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '高级文本 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '高级文本 worker 合成后 base 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '高级文本不产生后端 miss').to.eq(0)
      expect(stats.workerRender.fallbackCount, '高级文本 worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '高级文本真实 worker 后端命中').to.be.greaterThan(0)
    })
  })

  it('area 静态装饰和 group 行内装饰可进入真实 worker 快照', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      editor.command.executeSetValue(
        {
          header: [],
          main: createAreaGroupWorkerDocument(160),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(1)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPosition().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, 'area/group worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `area/group worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, 'area/group worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, 'area/group worker 合成后 base 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, 'area/group 不产生后端 miss').to.eq(0)
      expect(stats.workerRender.fallbackCount, 'area/group worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], 'area/group 真实 worker 后端命中').to.be.greaterThan(0)
    })
  })

  it('活动 group 交互态可在非当前页进入真实 worker 快照', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      editor.command.executeSetValue(
        {
          header: [],
          main: createActiveGroupWorkerDocument(180),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const activeGroupPositionList = draw.getPosition().getPositionList().filter((position: any) => {
        return position.element?.groupIds?.includes('worker-group-active-cross-page')
      })
      const activeGroupPageNo = activeGroupPositionList.find((position: any) => {
        return position.pageNo > 0
      })?.pageNo
      const activeAnchorIndex = draw.getOriginalMainElementList().findIndex((element: any) => {
        return element.groupIds?.includes('worker-group-active-cross-page')
      })
      expect(activeAnchorIndex, '活动 group 锚点索引').to.be.greaterThan(-1)
      expect(activeGroupPageNo, '活动 group 非当前页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(activeAnchorIndex, activeAnchorIndex)
      draw.getPosition().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([activeGroupPageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '活动 group worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `活动 group worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '活动 group worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '活动 group worker 合成后 base 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '活动 group 不产生后端 miss').to.eq(0)
      expect(stats.workerRender.fallbackCount, '活动 group worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '活动 group 真实 worker 后端命中').to.be.greaterThan(0)
      expect(
        Object.values(stats.baseRenderSource.lastSourceByPageNo).includes('worker-render'),
        '活动 group 页 base 来源包含 worker render'
      ).to.eq(true)
    })
  })

  it('隐藏 area、隐藏元素和隐藏控件在非设计态可跳过并进入真实 worker 快照', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      editor.command.executeSetValue(
        {
          header: [],
          main: createHiddenAreaWorkerDocument(80),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const hiddenAreaPosition = draw.getPosition().getPositionList().find((position: any) => {
        return position.element?.areaId === 'worker-area-hidden'
      })
      const hiddenAreaPageNo = hiddenAreaPosition?.pageNo
      expect(hiddenAreaPageNo, '隐藏 area 所在页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPosition().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([hiddenAreaPageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '隐藏 area worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `隐藏 area worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '隐藏 area worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '隐藏 area worker 合成后 base 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '隐藏 area 不产生后端 miss').to.eq(0)
      expect(stats.workerRender.fallbackCount, '隐藏 area worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '隐藏 area 真实 worker 后端命中').to.be.greaterThan(0)
      expect(
        Object.values(stats.baseRenderSource.lastSourceByPageNo).includes('worker-render'),
        '隐藏 area 页 base 来源包含 worker render'
      ).to.eq(true)
    })
  })

  it('列表、基础控件、普通图片和基础表格可进入真实 worker 快照', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      editor.command.executeSetValue(
        {
          header: [],
          main: createCoreWorkerDocument(),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      const elementList = draw.getOriginalMainElementList()
      const listStart = elementList.findIndex((element: any) => {
        return element.value === '列'
      })
      const listEnd = elementList.findIndex((element: any, index: number) => {
        return index > listStart && element.value === '\n'
      })
      editor.command.executeSetRange(listStart, listEnd)
      editor.command.executeList('ul', 'disc')
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(1)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([1])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.successCount, 'worker 成功次数').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
      expect(stats.workerRender.fallbackCount, 'worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '真实 worker 后端命中').to.be.greaterThan(0)
    })
  })

  it('浮动图片可进入真实 worker 快照并按 float position 合成', () => {
    let floatPageNo = -1
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      options.lineNumber.disabled = true
      options.pageBorder.disabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createFloatingImageWorkerDocument(),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const floatPosition = draw
        .getPosition()
        .getFloatPositionList()
        .find((position: any) => {
          return position.element?.id === 'worker-floating-image-target'
        })
      floatPageNo = floatPosition?.pageNo ?? -1
      expect(floatPageNo, '浮动图片所在页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([floatPageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '浮动图片 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `浮动图片 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '浮动图片 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const workerPageStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === floatPageNo && item.layer === 'base'
      })
      expect(stats.backend.missCount, '浮动图片不产生后端 miss').to.eq(0)
      expect(stats.backend.failureCount, '浮动图片快照不失败').to.eq(0)
      expect(stats.backend.fallbackCount, '浮动图片不触发后端 fallback').to.eq(0)
      expect(stats.workerRender.fallbackCount, '浮动图片 worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '浮动图片真实 worker 后端命中').to.be.greaterThan(0)
      expect(workerPageStats?.lastBackendName, '浮动图片页后端').to.eq('offscreen-canvas')
      expect(workerPageStats?.lastPriority, '浮动图片页 worker 优先级').to.eq('worker')
      expect(
        stats.baseRenderSource.lastSourceByPageNo[floatPageNo],
        '浮动图片页 base 来源'
      ).to.eq('worker-render')
    })
  })

  it('编辑态换行标记和分页符可进入真实 worker 快照', () => {
    let markerPageNo = -1
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      options.lineNumber.disabled = true
      options.pageBorder.disabled = true
      options.lineBreak.disabled = false
      editor.command.executeSetValue(
        {
          header: [],
          main: createAssistiveMarkerWorkerDocument(),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const pageBreakPosition = draw
        .getPosition()
        .getPositionList()
        .find((position: any) => {
          return position.element?.id === 'worker-page-break-marker'
        })
      markerPageNo = pageBreakPosition?.pageNo ?? -1
      expect(markerPageNo, '分页符所在页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([markerPageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '辅助标记 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `辅助标记 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '辅助标记 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const markerPageStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === markerPageNo && item.layer === 'base'
      })
      expect(stats.backend.missCount, '辅助标记不产生后端 miss').to.eq(0)
      expect(stats.backend.failureCount, '辅助标记快照不失败').to.eq(0)
      expect(stats.backend.fallbackCount, '辅助标记不触发后端 fallback').to.eq(0)
      expect(stats.workerRender.fallbackCount, '辅助标记 worker fallback 次数').to.eq(0)
      expect(markerPageStats?.lastBackendName, '辅助标记页后端').to.eq('offscreen-canvas')
      expect(markerPageStats?.lastPriority, '辅助标记页 worker 优先级').to.eq('worker')
      expect(
        stats.baseRenderSource.lastSourceByPageNo[markerPageNo],
        '辅助标记页 base 来源'
      ).to.eq('worker-render')
    })
  })

  it('TAB 与分散/两端对齐文本可进入真实 worker 快照', () => {
    let targetPageNo = -1
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      options.lineNumber.disabled = true
      options.pageBorder.disabled = true
      options.lineBreak.disabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createTabAndJustifiedWorkerDocument(),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const position = draw
        .getPosition()
        .getPositionList()
        .find((item: any) => item.element?.id === 'worker-justify-anchor')
      targetPageNo = position?.pageNo ?? -1
      expect(targetPageNo, 'TAB 和对齐文本所在页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([targetPageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, 'TAB / 对齐 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `TAB / 对齐 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, 'TAB / 对齐 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const pageStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === targetPageNo && item.layer === 'base'
      })
      expect(stats.backend.missCount, 'TAB / 对齐不产生后端 miss').to.eq(0)
      expect(stats.backend.failureCount, 'TAB / 对齐快照不失败').to.eq(0)
      expect(stats.backend.fallbackCount, 'TAB / 对齐不触发后端 fallback').to.eq(0)
      expect(stats.workerRender.fallbackCount, 'TAB / 对齐 worker fallback 次数').to.eq(0)
      expect(pageStats?.lastBackendName, 'TAB / 对齐页后端').to.eq('offscreen-canvas')
      expect(pageStats?.lastPriority, 'TAB / 对齐页 worker 优先级').to.eq('worker')
      expect(
        stats.baseRenderSource.lastSourceByPageNo[targetPageNo],
        'TAB / 对齐页 base 来源'
      ).to.eq('worker-render')
    })
  })

  it('group、area 和 control 包裹的非文本元素可进入真实 worker 快照', () => {
    let targetPageNo = -1
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      options.lineNumber.disabled = true
      options.pageBorder.disabled = true
      options.lineBreak.disabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createStyledNonTextWorkerDocument(),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const position = draw
        .getPosition()
        .getPositionList()
        .find((item: any) => item.element?.id === 'worker-styled-non-text-anchor')
      targetPageNo = position?.pageNo ?? -1
      expect(targetPageNo, '包裹非文本元素所在页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([targetPageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '包裹非文本 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `包裹非文本 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '包裹非文本 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const pageStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === targetPageNo && item.layer === 'base'
      })
      expect(stats.backend.missCount, '包裹非文本不产生后端 miss').to.eq(0)
      expect(stats.backend.failureCount, '包裹非文本快照不失败').to.eq(0)
      expect(stats.backend.fallbackCount, '包裹非文本不触发后端 fallback').to.eq(0)
      expect(stats.workerRender.fallbackCount, '包裹非文本 worker fallback 次数').to.eq(0)
      expect(pageStats?.lastBackendName, '包裹非文本页后端').to.eq('offscreen-canvas')
      expect(pageStats?.lastPriority, '包裹非文本页 worker 优先级').to.eq('worker')
      expect(
        stats.baseRenderSource.lastSourceByPageNo[targetPageNo],
        '包裹非文本页 base 来源'
      ).to.eq('worker-render')
    })
  })

  it('LaTeX SVG 可进入真实 worker 快照', () => {
    let targetPageNo = -1
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      options.lineNumber.disabled = true
      options.pageBorder.disabled = true
      options.lineBreak.disabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createLaTexWorkerDocument(),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const position = draw
        .getPosition()
        .getPositionList()
        .find((item: any) => item.element?.id === 'worker-latex-anchor')
      targetPageNo = position?.pageNo ?? -1
      expect(targetPageNo, 'LaTeX 所在页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([targetPageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, 'LaTeX worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `LaTeX worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, 'LaTeX worker 成功').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const pageStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === targetPageNo && item.layer === 'base'
      })
      expect(stats.backend.missCount, 'LaTeX 不产生后端 miss').to.eq(0)
      expect(stats.backend.failureCount, 'LaTeX 快照不失败').to.eq(0)
      expect(stats.backend.fallbackCount, 'LaTeX 不触发后端 fallback').to.eq(0)
      expect(stats.workerRender.fallbackCount, 'LaTeX worker fallback 次数').to.eq(0)
      expect(pageStats?.lastBackendName, 'LaTeX 页后端').to.eq('offscreen-canvas')
      expect(pageStats?.lastPriority, 'LaTeX 页 worker 优先级').to.eq('worker')
      expect(
        stats.baseRenderSource.lastSourceByPageNo[targetPageNo],
        'LaTeX 页 base 来源'
      ).to.eq('worker-render')
    })
  })

  it('复杂表格外框、虚线、斜线和显式单元格边框可进入真实 worker 快照', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.watermark.data = ''
      editor.command.executeSetValue(
        {
          header: [],
          main: createComplexTableWorkerDocument(),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const tablePosition = draw.getPosition().getPositionList().find((position: any) => {
        return position.element?.id === 'worker-complex-table-external'
      })
      const tablePageNo = tablePosition?.pageNo
      expect(tablePageNo, '复杂表格所在页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([tablePageNo])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.submitCount, '复杂表格 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `复杂表格 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '复杂表格 worker 成功').to.be.greaterThan(0)
      })
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '复杂表格 worker 合成后 base 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '复杂表格不产生后端 miss').to.eq(0)
      expect(stats.workerRender.fallbackCount, '复杂表格 worker fallback 次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'], '复杂表格真实 worker 后端命中').to.be.greaterThan(0)
      expect(
        Object.values(stats.baseRenderSource.lastSourceByPageNo).includes('worker-render'),
        '复杂表格页 base 来源包含 worker render'
      ).to.eq(true)
    })
  })

  it('搜索态与激活控件页保持同步 base，不进入 worker 或 bitmap 覆盖路径', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            ...createLargeDocument(110),
            {
              type: 'control',
              value: '',
              control: {
                type: 'text',
                value: [{ value: '活动控件页' }],
                placeholder: '诊断'
              }
            },
            ...createLargeDocument(80)
          ],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const controlIndex = draw
        .getOriginalMainElementList()
        .findIndex((element: any) => Boolean(element.controlId))
      const controlPageNo =
        draw.getPosition().getPositionList()[controlIndex]?.pageNo
      expect(controlIndex, '控件元素索引').to.be.greaterThan(-1)
      expect(controlPageNo, '控件所在页').to.be.greaterThan(0)

      editor.command.executeSearch('canvas-render-backend-line-90')
      draw.getServices().workerRenderScheduler.dispose()
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      renderVisiblePages(draw, [controlPageNo])

      const stats = getRenderBackendStats(editor)
      const searchedPageStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === controlPageNo && item.layer === 'base'
      })
      expect(stats.workerRender.submitCount, '搜索态 worker 提交次数').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'] || 0).to.eq(0)
      expect(searchedPageStats?.lastBackendName, '搜索态非当前页 base 后端').to.eq('canvas-2d')
      expect(searchedPageStats?.lastPriority, '搜索态非当前页 base 优先级').to.eq('sync')
      expect(stats.backend.missCount, '搜索态不产生后端 miss').to.eq(0)

      editor.command.executeSearch(null)
      draw.getRange().setRange(controlIndex, controlIndex)
      draw.getControl().initControl()
      draw.setPageNo(0)
      draw.getServices().workerRenderScheduler.dispose()
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      renderVisiblePages(draw, [controlPageNo])

      const activeControlStats = getRenderBackendStats(editor)
      const controlPageStats =
        activeControlStats.backend.pageEngineStatsList.find(item => {
          return item.pageNo === controlPageNo && item.layer === 'base'
        })
      expect(controlPageStats?.lastBackendName, '激活控件页 base 后端').to.eq('canvas-2d')
      expect(controlPageStats?.lastPriority, '激活控件页 base 优先级').to.eq('sync')
      expect(
        activeControlStats.baseRenderSource.lastSourceByPageNo[controlPageNo],
        '激活控件页 base 来源'
      ).to.eq('canvas-2d-render')
      expect(activeControlStats.backend.missCount, '激活控件页不产生 miss').to.eq(0)
    })
  })

  it('worker 不支持的 base 内容会回退 Canvas2D，不产生页面 miss', () => {
    let unsupportedPageNo = -1
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.lineBreak.disabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            ...createLargeDocument(100),
            {
              id: 'worker-unsupported-block',
              type: 'block',
              value: '',
              width: 180,
              height: 44,
              block: {
                type: 'iframe',
                iframeBlock: {
                  srcdoc: '<div style="font:14px sans-serif">worker unsupported block</div>'
                }
              }
            },
            {
              value: '\n'
            },
            ...createLargeDocument(40)
          ],
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
      const unsupportedPosition = draw
        .getPosition()
        .getPositionList()
        .find((position: any) => {
          return position.element?.id === 'worker-unsupported-block'
        })
      unsupportedPageNo = unsupportedPosition?.pageNo ?? -1
      expect(unsupportedPageNo, '不支持元素所在页').to.be.greaterThan(0)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getServices().workerRenderScheduler.dispose()
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      renderVisiblePages(draw, [unsupportedPageNo])
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const fallbackPageStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === unsupportedPageNo && item.layer === 'base'
      })
      expect(stats.backend.missCount, '不支持命令不产生最终 miss').to.eq(0)
      expect(stats.backend.failureCount, 'offscreen 快照失败次数').to.be.greaterThan(0)
      expect(stats.backend.fallbackCount, 'Canvas2D fallback 次数').to.be.greaterThan(0)
      expect(stats.backend.backendFailureCountMap['offscreen-canvas']).to.be.greaterThan(0)
      expect(stats.backend.backendFallbackCountMap['canvas-2d']).to.be.greaterThan(0)
      expect(stats.workerRender.submitCount, '快照失败不会提交 worker').to.eq(0)
      expect(fallbackPageStats?.lastBackendName, 'fallback 后端').to.eq('canvas-2d')
      expect(fallbackPageStats?.lastFallback, '页面记录 fallback').to.eq(true)
      expect(
        fallbackPageStats?.lastFailedBackendNameList.includes('offscreen-canvas'),
        '页面记录失败 offscreen 后端'
      ).to.eq(true)
    })
  })

  it('worker 超时后回退 Canvas2D，连续失败熔断后不再匹配 OffscreenCanvas', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
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
      draw.getServices().workerRenderScheduler.dispose()
      draw.getServices().workerRenderScheduler.configureDebugOptions({
        timeoutMs: 0,
        circuitBreakerFailureThreshold: 1
      })
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      renderVisiblePages(draw, [1])
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.timeoutCount, 'worker 超时次数').to.be.greaterThan(0)
        expect(stats.workerRender.fallbackCount, 'worker timeout fallback 次数').to.be.greaterThan(0)
        expect(stats.workerRender.circuitOpen, 'worker 熔断状态').to.eq(true)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, 'timeout fallback 不产生 miss').to.eq(0)
      expect(stats.baseRenderSource.canvas2DRenderCount, 'timeout 后同步绘制 base').to.be.greaterThan(0)
      expect(stats.workerRender.circuitOpenCount, '熔断打开次数').to.be.greaterThan(0)
      expect(stats.workerRender.lastFallbackReason, '最近 fallback 原因').to.include(
        'worker circuit breaker open'
      )

      const draw = getDraw(editor)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      renderVisiblePages(draw, [1])
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const pageStats = stats.backend.pageEngineStatsList.find(item => {
        return item.pageNo === 1 && item.layer === 'base'
      })
      expect(stats.workerRender.circuitOpen, '熔断保持打开').to.eq(true)
      expect(stats.workerRender.submitCount, '熔断后不再提交 worker').to.eq(0)
      expect(stats.backend.backendHitCountMap['offscreen-canvas'] || 0).to.eq(0)
      expect(pageStats?.lastBackendName, '熔断后直接走 Canvas2D').to.eq('canvas-2d')
      expect(pageStats?.lastPriority, '熔断后任务仍可保持 worker 优先级但由 Canvas2D 承接').to.eq('worker')
      expect(stats.backend.missCount, '熔断后不产生 miss').to.eq(0)
    })
  })

  it('worker 队列超限丢弃远端旧任务并回退 Canvas2D', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(240),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      expect(draw.getPageRowList().length, '分页页数').to.be.greaterThan(4)
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.setVisiblePageNoList([1, 2, 3, 4])
      draw.setIntersectionPageNo(1)
      draw.getServices().workerRenderScheduler.dispose()
      draw.getServices().workerRenderScheduler.configureDebugOptions({
        maxQueueLength: 1,
        circuitBreakerFailureThreshold: 99
      })
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      renderVisiblePages(draw, [1, 2, 3, 4])
    })

    cy.getEditor().then((editor: any) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = getRenderBackendStats(editor)
        expect(stats.workerRender.queueDropCount, 'worker 队列丢弃次数').to.be.greaterThan(0)
        expect(stats.workerRender.fallbackCount, '队列丢弃 fallback 次数').to.be.greaterThan(0)
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '队列丢弃不产生 miss').to.eq(0)
      expect(stats.baseRenderSource.canvas2DRenderCount, '队列丢弃页同步绘制').to.be.greaterThan(0)
      expect(stats.workerRender.lastFallbackReason, '队列丢弃原因').to.eq(
        'worker queue limit exceeded'
      )
      expect(stats.workerRender.maxQueueLength, '测试队列上限生效').to.eq(1)
      expect(stats.workerRender.circuitOpen, '少量队列丢弃不应熔断').to.eq(false)
    })
  })

  it('滚动卸载再回到页面后 canvas 池和 bitmap 缓存统计保持有效', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(120),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      const draw = getDraw(editor)
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(600)

    cy.getEditor().then((editor: any) => {
      waitForBitmapCacheReady(editor)
    })

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const host = draw.getPageCanvasHost()
      const initialPageCount = host.getPageCount()
      expect(initialPageCount, '分页页数').to.be.greaterThan(1)

      // 直接走 PageCanvasHost 的浏览器实例方法，稳定触发 canvas 池释放和复用。
      host.unmountCanvas(0)
      host.mountCanvas(0)
      redrawPageWithoutInvalidatingBaseBitmap(draw, 0)
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.canvasPool.acquireCount, 'canvas 池申请次数').to.be.greaterThan(0)
      expect(stats.canvasPool.releaseCount, 'canvas 池释放次数').to.be.greaterThan(0)
      expect(stats.canvasPool.hitCount, 'canvas 池复用次数').to.be.greaterThan(0)
      expect(stats.canvasPool.hitRate, 'canvas 池复用命中率').to.be.greaterThan(0)
      expect(stats.surface.bitmapCache.setCount, 'bitmap 写入次数').to.be.greaterThan(0)
      expect(stats.surface.bitmapCache.count, 'bitmap 缓存数量').to.be.greaterThan(0)
      expect(
        stats.surface.bitmapCache.recentWindow.sampleCount,
        'bitmap 近期窗口样本'
      ).to.be.greaterThan(0)
      expect(
        stats.surface.bitmapCache.composeHitCount,
        'bitmap cache 合成命中次数'
      ).to.be.greaterThan(0)
      expect(
        stats.baseRenderSource.bitmapCacheComposeCount,
        'base 来源统计记录 bitmap cache 合成'
      ).to.be.greaterThan(0)
      expect(
        stats.baseRenderSource.lastSourceByPageNo[0],
        '页面 0 最近 base 来源为 bitmap cache'
      ).to.eq('bitmap-cache-compose')
      expect(stats.backend.missCount, '后端未命中次数').to.eq(0)
    })
  })

  it('WebGL 图片任务和 DOM/SVG block 任务有独立 engine 命中与 fallback 边界', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.webgl.enabled = true
      options.renderBackend.svgDom.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: '图片任务：'
            },
            {
              type: 'image',
              value: TEST_IMAGE,
              width: 60,
              height: 30
            },
            {
              value: '\nblock任务：'
            },
            {
              id: 'render-backend-block',
              type: 'block',
              value: '',
              width: 180,
              height: 44,
              block: {
                type: 'iframe',
                iframeBlock: {
                  srcdoc: '<div style="font:14px sans-serif">block task</div>'
                }
              }
            },
            ...createLargeDocument(20)
          ],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const capabilityMap = Object.fromEntries(
        stats.backend.capabilityList.map(item => [item.name, item])
      )
      expect(capabilityMap.webgl?.enabled, 'WebGL 图片任务已启用').to.eq(true)
      expect(capabilityMap['svg-dom']?.enabled, 'DOM/SVG block 任务已启用').to.eq(true)
      expect(stats.backend.backendHitCountMap.webgl, 'WebGL 图片任务命中').to.be.greaterThan(0)
      expect(stats.backend.backendHitCountMap['svg-dom'], 'DOM/SVG block 任务命中').to.be.greaterThan(0)
      expect(capabilityMap.webgl?.textureCacheSize, 'WebGL 纹理缓存已写入').to.be.greaterThan(0)
      expect(capabilityMap.webgl?.textureUploadCount, 'WebGL 纹理上传次数').to.be.greaterThan(0)
      expect(stats.backend.missCount, '独立任务不产生 miss').to.eq(0)
    })

    cy.get('iframe[data-id="render-backend-block"]').should('have.length', 1)
  })

  it('WebGL 图片任务复用纹理缓存，并按上限淘汰旧纹理', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.webgl.enabled = true
      options.renderBackend.webgl.maxTextureCacheSize = 1
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'webgl-cache-a：'
            },
            {
              type: 'image',
              value: TEST_IMAGE,
              width: 60,
              height: 30
            },
            {
              value: '\nwebgl-cache-a-repeat：'
            },
            {
              type: 'image',
              value: TEST_IMAGE,
              width: 62,
              height: 30,
              webglFilter: {
                brightness: 1.04
              }
            },
            {
              value: '\nwebgl-cache-b：'
            },
            {
              type: 'image',
              value: TEST_PNG_IMAGE,
              width: 24,
              height: 24
            },
            ...createLargeDocument(20)
          ],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const capabilityMap = Object.fromEntries(
        stats.backend.capabilityList.map(item => [item.name, item])
      )
      expect(stats.backend.backendHitCountMap.webgl, 'WebGL 图片任务命中').to.be.greaterThan(1)
      expect(capabilityMap.webgl?.textureReuseCount, '同图 WebGL 纹理复用').to.be.greaterThan(0)
      expect(capabilityMap.webgl?.textureUploadCount, '不同图 WebGL 纹理上传').to.be.greaterThan(1)
      expect(capabilityMap.webgl?.textureEvictCount, 'WebGL 纹理 LRU 淘汰').to.be.greaterThan(0)
      expect(capabilityMap.webgl?.textureCacheSize, 'WebGL 纹理缓存上限生效').to.eq(1)
      expect(stats.backend.missCount, 'WebGL 纹理缓存不产生 miss').to.eq(0)
    })
  })

  it('WebGL 图片任务通过 shader 执行滤镜和降采样输出', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.webgl.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'webgl-filter-downsample：'
            },
            {
              type: 'image',
              value: TEST_IMAGE,
              width: 30,
              height: 15,
              webglFilter: {
                grayscale: 1,
                brightness: 1.08,
                contrast: 1.25
              },
              webglDownsample: true
            },
            ...createLargeDocument(20)
          ],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(800)

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, 'WebGL 滤镜页真实绘制非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const capabilityMap = Object.fromEntries(
        stats.backend.capabilityList.map(item => [item.name, item])
      )
      expect(stats.backend.backendHitCountMap.webgl, 'WebGL 图片任务命中').to.be.greaterThan(0)
      expect(capabilityMap.webgl?.filterApplyCount, 'WebGL shader 滤镜执行次数').to.be.greaterThan(0)
      expect(
        capabilityMap.webgl?.downsampleRenderCount,
        'WebGL 降采样输出执行次数'
      ).to.be.greaterThan(0)
      expect(capabilityMap.webgl?.textureCacheSize, '滤镜任务仍复用源纹理缓存').to.be.greaterThan(0)
      expect(stats.backend.missCount, 'WebGL 滤镜降采样不产生 miss').to.eq(0)
      expect(stats.backend.failureCount, 'WebGL 滤镜降采样不产生失败').to.eq(0)
    })
  })

  it('WebGL 图片任务通过 shader 执行裁剪和旋转预览，导出按 Canvas2D 同语义固化', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = getDraw(editor)
        const options = draw.getRuntime().getOptions()
        options.renderBackend.webgl.enabled = true
        editor.command.executeSetValue(
          {
            header: [],
            main: [
              {
                value: 'webgl-crop-rotate：'
              },
              {
                type: 'image',
                value: TEST_IMAGE,
                width: 72,
                height: 72,
                webglCrop: {
                  x: 4,
                  y: 4,
                  width: 52,
                  height: 22
                },
                webglRotation: 90,
                webglFilter: {
                  brightness: 1.05,
                  contrast: 1.1
                }
              },
              ...createLargeDocument(20)
            ],
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        draw.render({
          isCompute: false,
          isSubmitHistory: false,
          isSetCursor: false,
          isLazy: false,
          pageRenderScope: 'visible'
        })
      })
    })

    cy.window({ timeout: 10000 }).its('editor').should((editor: any) => {
      const visualStats = getRenderBackendStats(editor)
      expect(
        visualStats.backend.backendHitCountMap.webgl,
        'WebGL 裁剪旋转可视任务命中'
      ).to.be.greaterThan(0)
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, 'WebGL 裁剪旋转页真实绘制非白像素').to.be.greaterThan(500)
    })

    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        editor.resetRenderBackendStats()
        cy.wrap(editor.command.getImage()).then((dataUrlList: string[]) => {
          expect(dataUrlList.length, '裁剪旋转导出页数').to.be.greaterThan(0)
          readDataUrlPixelStats(win, dataUrlList[0]).then(pixelStats => {
            expect(pixelStats.nonWhite, '裁剪旋转导出图片非白像素').to.be.greaterThan(500)
          })
        })
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const capabilityMap = Object.fromEntries(
        stats.backend.capabilityList.map(item => [item.name, item])
      )
      expect(stats.backend.backendHitCountMap.webgl || 0, '裁剪旋转导出不命中 WebGL').to.eq(0)
      expect(stats.backend.backendHitCountMap['canvas-2d'], '裁剪旋转导出通过 Canvas2D 固化').to.be.greaterThan(0)
      expect(capabilityMap.webgl?.cropRenderCount, 'WebGL 裁剪 shader 执行次数').to.be.greaterThan(0)
      expect(
        capabilityMap.webgl?.rotationRenderCount,
        'WebGL 旋转 shader 执行次数'
      ).to.be.greaterThan(0)
      expect(capabilityMap.webgl?.filterApplyCount, '裁剪旋转仍可组合滤镜').to.be.greaterThan(0)
      expect(stats.backend.taskStats.renderCountByReason.export, '裁剪旋转 export task 命中').to.be.greaterThan(0)
      expect(stats.backend.missCount, 'WebGL 裁剪旋转不产生 miss').to.eq(0)
      expect(stats.backend.failureCount, 'WebGL 裁剪旋转不产生失败').to.eq(0)
    })
  })

  it('WebGL 图片任务复用预览 bitmap 缓存，二次重绘不重复派发 image-webgl', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.webgl.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'webgl-preview-bitmap-cache：'
            },
            {
              type: 'image',
              value: TEST_IMAGE,
              width: 72,
              height: 72,
              webglCrop: {
                x: 4,
                y: 4,
                width: 52,
                height: 22
              },
              webglRotation: 90,
              webglFilter: {
                grayscale: 0.2,
                brightness: 1.08,
                contrast: 1.2
              }
            },
            ...createLargeDocument(20)
          ],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
    })

    cy.wait(500)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      draw.getImageParticle().clearPreviewBitmapCache()
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.window({ timeout: 10000 }).its('editor').should((editor: any) => {
      const firstStats = getRenderBackendStats(editor)
      expect(firstStats.imagePreview.setCount, '首轮写入预览 bitmap 缓存').to.be.greaterThan(0)
      expect(firstStats.imagePreview.count, '预览 bitmap 缓存持有处理结果').to.be.greaterThan(0)
      expect(
        firstStats.backend.taskStats.dispatchCountByReason['image-webgl'],
        '首轮派发 image-webgl'
      ).to.be.greaterThan(0)
      expect(firstStats.backend.backendHitCountMap.webgl, '首轮命中 WebGL').to.be.greaterThan(0)
    })

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.window({ timeout: 10000 }).its('editor').should((editor: any) => {
      const secondStats = getRenderBackendStats(editor)
      expect(secondStats.imagePreview.hitCount, '二次重绘命中预览 bitmap 缓存').to.be.greaterThan(0)
      expect(secondStats.imagePreview.hitRate, '预览 bitmap 缓存命中率可观测').to.be.greaterThan(0)
      expect(
        secondStats.imagePreview.estimatedSavedRenderPixels,
        '复用预览 bitmap 后节省的重绘像素可观测'
      ).to.be.greaterThan(0)
      expect(secondStats.imagePreview.setCount, '二次重绘不重复写入同参数预览 bitmap').to.eq(0)
      expect(
        secondStats.backend.taskStats.dispatchCountByReason['image-webgl'] || 0,
        '二次重绘不再派发 image-webgl'
      ).to.eq(0)
      expect(secondStats.backend.backendHitCountMap.webgl || 0, '二次重绘不再命中 WebGL').to.eq(0)
      expect(secondStats.backend.missCount, '预览 bitmap 缓存命中不产生 backend miss').to.eq(0)
    })

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, '预览 bitmap 缓存命中后页面仍真实绘制非白像素').to.be.greaterThan(500)
    })
  })

  it('WebGL 图片任务暴露高分辨率收益和显存预算统计', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.webgl.enabled = true
      options.renderBackend.webgl.maxTextureCacheSize = 8
      options.renderBackend.webgl.maxTextureCacheBytes = 1024
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'webgl-budget-a：'
            },
            {
              type: 'image',
              value: TEST_IMAGE,
              width: 48,
              height: 24,
              webglDownsample: true
            },
            {
              value: '\nwebgl-budget-b：'
            },
            {
              type: 'image',
              value: TEST_PNG_IMAGE,
              width: 48,
              height: 24,
              webglFilter: {
                brightness: 1.1
              }
            },
            ...createLargeDocument(20)
          ],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(300)

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const capabilityMap = Object.fromEntries(
        stats.backend.capabilityList.map(item => [item.name, item])
      )
      const webgl = capabilityMap.webgl
      expect(webgl?.enabled, 'WebGL 图片任务启用').to.eq(true)
      expect(webgl?.maxTextureCacheBytes, '显存预算字节数可观测').to.eq(1024)
      expect(webgl?.maxTextureCacheMB, '显存预算 MB 可观测').to.be.a('number')
      expect(webgl?.textureCacheBytes, '当前纹理缓存字节数可观测').to.be.at.most(1024)
      expect(webgl?.textureBudgetEvictCount, '显存预算淘汰次数可观测').to.be.greaterThan(0)
      expect(webgl?.originalSourcePixels, '源图像素输入可观测').to.be.greaterThan(0)
      expect(webgl?.outputPixels, '输出像素可观测').to.be.greaterThan(0)
      expect(
        webgl?.estimatedDownsampleSavedPixels,
        '降采样节省像素估算可观测'
      ).to.be.at.least(0)
    })
  })

  it('可输出渲染后端 debug snapshot，并在开启时挂载只读面板', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.debugPanel.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(12),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      const snapshot = getRenderBackendDebugSnapshot(editor)
      expect(snapshot.pageCount, 'debug snapshot 页数').to.be.greaterThan(0)
      expect(snapshot.backend.dispatchCount, 'debug snapshot 后端调度数').to.be.at.least(0)
      expect(snapshot.memory.estimatedTotalMB, 'debug snapshot 总内存 MB').to.be.a('number')
      expect(snapshot.documentTextStore.mirrorHealthy, 'debug snapshot mirror 健康').to.eq(true)
      expect(snapshot.image.previewCacheHitRate, 'debug snapshot 图片命中率').to.be.a('number')
      const panel = draw
        .getPageCanvasHost()
        .getContainer()
        .querySelector('[data-render-backend-debug-panel="true"]') as HTMLElement | null
      expect(panel, 'debug panel 已挂载').to.exist
      expect(panel?.dataset.mirrorHealthy, 'debug panel mirror 状态').to.eq('true')
    })
  })

  it('WebGL context lost 后图片任务回退 Canvas2D，不影响 DOM/SVG block 重挂', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.webgl.enabled = true
      options.renderBackend.webgl.forceContextLost = true
      options.renderBackend.svgDom.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'lost图片任务：'
            },
            {
              type: 'image',
              value: TEST_IMAGE,
              width: 60,
              height: 30
            },
            {
              value: '\nlost block任务：'
            },
            {
              id: 'render-backend-lost-block',
              type: 'block',
              value: '',
              width: 180,
              height: 44,
              block: {
                type: 'iframe',
                iframeBlock: {
                  srcdoc: '<div style="font:14px sans-serif">lost block task</div>'
                }
              }
            },
            ...createLargeDocument(20)
          ],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(800)

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      const capabilityMap = Object.fromEntries(
        stats.backend.capabilityList.map(item => [item.name, item])
      )
      expect(capabilityMap.webgl?.enabled, 'WebGL context lost 后禁用图片任务').to.eq(false)
      expect(stats.backend.backendHitCountMap.webgl || 0, 'WebGL 不应命中').to.eq(0)
      expect(stats.backend.backendHitCountMap['canvas-2d'], '图片任务回退 Canvas2D').to.be.greaterThan(0)
      expect(stats.backend.backendHitCountMap['svg-dom'], 'DOM/SVG block 仍命中').to.be.greaterThan(0)
      expect(stats.backend.failureCount, 'context lost 不应抛失败').to.eq(0)
      expect(stats.backend.missCount, 'context lost 不产生 miss').to.eq(0)
    })

    cy.get('iframe[data-id="render-backend-lost-block"]').should('have.length', 1)
  })

  it('DOM/SVG block 随页面卸载清理，重挂和 bitmap cache 命中后可重新创建 host', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const options = draw.getRuntime().getOptions()
      options.renderBackend.svgDom.enabled = true
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'block重挂：'
            },
            {
              id: 'render-backend-remount-block',
              type: 'block',
              value: '',
              width: 180,
              height: 44,
              block: {
                type: 'iframe',
                iframeBlock: {
                  srcdoc: '<div style="font:14px sans-serif">remount block task</div>'
                }
              }
            },
            ...createLargeDocument(120)
          ],
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(800)
    cy.get('iframe[data-id="render-backend-remount-block"]').should('have.length', 1)

    cy.getEditor().then((editor: any) => {
      waitForBitmapCacheReady(editor)
    })

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const host = draw.getPageCanvasHost()
      host.unmountCanvas(0)
    })

    cy.get('iframe[data-id="render-backend-remount-block"]').should('have.length', 0)

    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      const host = draw.getPageCanvasHost()
      host.mountCanvas(0)
      redrawPageWithoutInvalidatingBaseBitmap(draw, 0)
    })

    cy.wait(800)
    cy.get('iframe[data-id="render-backend-remount-block"]').should('have.length', 1)

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.surface.bitmapCache.composeHitCount, '重挂后 bitmap cache 合成命中').to.be.greaterThan(0)
      expect(
        stats.baseRenderSource.bitmapCacheComposeCount,
        'base 来源记录 bitmap cache 合成'
      ).to.be.greaterThan(0)
      expect(stats.backend.backendHitCountMap['svg-dom'], 'cache 命中后重放 block host').to.be.greaterThan(0)
      expect(stats.backend.missCount, 'DOM/SVG block 重挂不产生 miss').to.eq(0)
    })
  })

  it('SVG block 可挂载 DOM/SVG host，导出时 rasterize 到 Canvas2D', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = getDraw(editor)
        const options = draw.getRuntime().getOptions()
        options.renderBackend.svgDom.enabled = true
        editor.command.executeSetValue(
          {
            header: [],
            main: [
              {
                value: 'svg block任务：\n'
              },
              {
                id: 'render-backend-svg-block',
                type: 'block',
                value: '',
                width: 180,
                height: 72,
                block: {
                  type: 'svg',
                  svgBlock: {
                    svg: TEST_SVG_BLOCK
                  }
                }
              },
              ...createLargeDocument(20)
            ],
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        draw.render({
          isCompute: false,
          isSubmitHistory: false,
          isSetCursor: false,
          isLazy: false,
          pageRenderScope: 'visible'
        })
        cy.get('[data-id="render-backend-svg-block"][data-type="svg-block"]').should('have.length', 1)
        cy.get('[data-id="render-backend-svg-block"][data-type="svg-block"] svg').should('have.length', 1)
        cy.wrap(editor.command.getImage()).then((dataUrlList: string[]) => {
          expect(dataUrlList.length, 'SVG block 导出页数').to.be.greaterThan(0)
          readDataUrlPixelStats(win, dataUrlList[0]).then(pixelStats => {
            expect(pixelStats.nonWhite, 'SVG block 导出 rasterize 后非白像素').to.be.greaterThan(2000)
          })
        })
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.backendHitCountMap['svg-dom'], 'SVG block 可视 host 命中').to.be.greaterThan(0)
      expect(stats.backend.backendHitCountMap['canvas-2d'], 'SVG block 导出通过 Canvas2D 固化').to.be.greaterThan(0)
      expect(stats.backend.taskStats.renderCountByReason.export, 'SVG block export task 命中').to.be.greaterThan(0)
      expect(stats.backend.missCount, 'SVG block 导出不产生 miss').to.eq(0)
    })
  })

  it('HTML block 可挂载 DOM host，导出时使用稳定 Canvas2D 文本 fallback', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = getDraw(editor)
        const options = draw.getRuntime().getOptions()
        options.renderBackend.svgDom.enabled = true
        editor.command.executeSetValue(
          {
            header: [],
            main: [
              {
                value: 'html block任务：\n'
              },
              {
                id: 'render-backend-html-block',
                type: 'block',
                value: '',
                width: 220,
                height: 80,
                block: {
                  type: 'html',
                  htmlBlock: {
                    html:
                      '<section style="font:14px sans-serif;padding:10px;background:#e7f5ff;color:#1c3f5c"><strong>HTML Block</strong><p style="margin:8px 0 0">stable export fallback</p></section>'
                  }
                }
              },
              ...createLargeDocument(20)
            ],
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        draw.render({
          isCompute: false,
          isSubmitHistory: false,
          isSetCursor: false,
          isLazy: false,
          pageRenderScope: 'visible'
        })
        cy.get('[data-id="render-backend-html-block"][data-type="html-block"]').should('have.length', 1)
        cy.get('[data-id="render-backend-html-block"][data-type="html-block"] strong').should(
          'contain.text',
          'HTML Block'
        )
        cy.wrap(editor.command.getImage()).then((dataUrlList: string[]) => {
          expect(dataUrlList.length, 'HTML block 导出页数').to.be.greaterThan(0)
          readDataUrlPixelStats(win, dataUrlList[0]).then(pixelStats => {
            expect(pixelStats.nonWhite, 'HTML block 导出 fallback 后非白像素').to.be.greaterThan(1000)
          })
        })
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.backendHitCountMap['svg-dom'], 'HTML block 可视 host 命中').to.be.greaterThan(0)
      expect(stats.backend.backendHitCountMap['canvas-2d'], 'HTML block 导出通过 Canvas2D fallback 固化').to.be.greaterThan(0)
      expect(stats.backend.taskStats.renderCountByReason.export, 'HTML block export task 命中').to.be.greaterThan(0)
      expect(stats.backend.missCount, 'HTML block 导出不产生 miss').to.eq(0)
    })
  })

  it('图片和 DOM/SVG block 导出显式回退 Canvas2D，不依赖 WebGL 或可视 DOM host', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: any) => {
        const draw = getDraw(editor)
        const options = draw.getRuntime().getOptions()
        options.renderBackend.webgl.enabled = true
        options.renderBackend.svgDom.enabled = true
        editor.command.executeSetValue(
          {
            header: [],
            main: [
              {
                value: 'export图片任务：'
              },
              {
                type: 'image',
                value: TEST_IMAGE,
                width: 60,
                height: 30
              },
              {
                value: '\nexport block任务：'
              },
              {
                id: 'render-backend-export-block',
                type: 'block',
                value: '',
                width: 180,
                height: 44,
                block: {
                  type: 'iframe',
                  iframeBlock: {
                    srcdoc: '<div style="font:14px sans-serif">export block task</div>'
                  }
                }
              },
              ...createLargeDocument(20)
            ],
            footer: []
          },
          {
            isSetCursor: true
          }
        )
        editor.resetRenderBackendStats()
        cy.wrap(editor.command.getImage()).then((dataUrlList: string[]) => {
          expect(dataUrlList.length, '导出页数').to.be.greaterThan(0)
          expect(dataUrlList[0], '导出 dataURL').to.match(/^data:image\/png/)
          readDataUrlPixelStats(win, dataUrlList[0]).then(pixelStats => {
            expect(pixelStats.nonWhite, '导出图片非白像素').to.be.greaterThan(500)
          })
        })
      })
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.backendHitCountMap.webgl || 0, '导出不命中 WebGL').to.eq(0)
      expect(stats.backend.backendHitCountMap['svg-dom'] || 0, '导出不挂 DOM/SVG host').to.eq(0)
      expect(stats.backend.backendHitCountMap['canvas-2d'], '导出通过 Canvas2D 固化').to.be.greaterThan(0)
      expect(stats.backend.taskStats.renderCountByReason.export, 'export task 命中').to.be.greaterThan(0)
      expect(stats.backend.missCount, '导出不产生 miss').to.eq(0)
    })

    cy.get('iframe[data-id="render-backend-export-block"]').should('have.length', 0)
  })

  it('实验 engine 失败后回退到 Canvas2D，并记录失败和 fallback 统计', () => {
    cy.getEditor().then((editor: any) => {
      const draw = getDraw(editor)
      draw.getServices().renderBackendManager.register(
        {
          name: 'failing-experiment',
          getCapability: () => ({
            supported: true,
            enabled: true
          }),
          canRender: (task: any) => {
            return task.layer === 'base' && task.reason === 'base-visible'
          },
          render: () => {
            throw new Error('intentional backend failure')
          }
        },
        {
          priority: 'first'
        }
      )
      editor.command.executeSetValue(
        {
          header: [],
          main: createLargeDocument(60),
          footer: []
        },
        {
          isSetCursor: true
        }
      )
      draw.setPageNo(0)
      draw.getRange().setRange(0, 0)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      editor.resetRenderBackendStats()
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })

    cy.wait(600)

    cy.document().then(doc => {
      const canvas = getFirstMountedBaseCanvas(doc)
      const pixelStats = readCanvasPixelStats(canvas)
      expect(pixelStats.nonWhite, 'fallback 后 base canvas 非白像素').to.be.greaterThan(500)
    })

    cy.getEditor().then((editor: any) => {
      const stats = getRenderBackendStats(editor)
      expect(stats.backend.missCount, '失败后不应最终 miss').to.eq(0)
      expect(stats.backend.failureCount, '实验 engine 失败次数').to.be.greaterThan(0)
      expect(stats.backend.fallbackCount, 'fallback 次数').to.be.greaterThan(0)
      expect(stats.backend.backendFailureCountMap['failing-experiment']).to.be.greaterThan(0)
      expect(stats.backend.backendFallbackCountMap['canvas-2d']).to.be.greaterThan(0)
      expect(stats.backend.recentWindow.failureCount).to.be.greaterThan(0)
      expect(stats.backend.recentWindow.fallbackCount).to.be.greaterThan(0)
      expect(stats.backend.recentWindow.backendFailureCountMap['failing-experiment']).to.be.greaterThan(0)
      expect(stats.backend.recentWindow.backendFallbackCountMap['canvas-2d']).to.be.greaterThan(0)
      expect(
        stats.backend.pageEngineStatsList.some(item => {
          return (
            item.layer === 'base' &&
            item.lastRendered &&
            item.lastBackendName === 'canvas-2d' &&
            item.lastFallback &&
            item.lastFailedBackendNameList.includes('failing-experiment') &&
            item.failureCount > 0 &&
            item.fallbackCount > 0
          )
        }),
        'base 层应记录失败 engine 并回退 canvas-2d'
      ).to.eq(true)
    })
  })
})
