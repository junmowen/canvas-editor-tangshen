import type Editor from '../../../src/editor'
import type { ChartGraphicKind } from '../../../src/editor/core/modules/chart-graphics/model/ChartGraphic'
import { createDemoPdfFonts } from '../../../src/demo/pdfFonts'
import {
  createChartGraphicElement,
  syncChartGraphicElementSize
} from '../../../src/editor/core/modules/chart-graphics/command/ChartGraphicCommandPolicy'
import { hitTestChartGraphic } from '../../../src/editor/core/modules/chart-graphics/hittest/ChartGraphicHitTest'
import {
  downsampleChartSeriesPoints,
  resolveChartSeriesDataPoints
} from '../../../src/editor/core/modules/chart-graphics/render/ChartGraphicSeriesPointPolicy'
import {
  flattenChartSmoothBezierSegmentList,
  resolveChartSmoothBezierSegmentList
} from '../../../src/editor/core/modules/chart-graphics/render/ChartGraphicSeriesGeometryPolicy'
import {
  resolveChartBarRect,
  resolveChartAxisPointValueFromLocalCoordinate,
  resolveChartLegendLayout,
  resolveChartPointCoordinate,
  resolveChartRenderContext
} from '../../../src/editor/core/modules/chart-graphics/render/ChartGraphicCoordinatePolicy'
import { pushChartGraphicWorkerSnapshotCommands } from '../../../src/editor/core/modules/chart-graphics/render/ChartGraphicWorkerSnapshotPolicy'
import { handleImageSelectionStart } from '../../../src/editor/core/modules/image/interaction/handleImageSelectionStart'
import {
  createPdfBlobFromPrintSvgDocument,
  createPrintSvgPageListFromDocument
} from '../../../src/editor/utils/print'
import { createPrintSvgChartGraphic } from '../../../src/editor/core/modules/chart-graphics/render/ChartGraphicSvgExporter'
import {
  createDomFromElementList,
  getElementListByHTML
} from '../../../src/editor/utils/elementDom'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { EditorMode } from '../../../src/editor/dataset/enum/Editor'
import { resolveChartGraphicFragmentChart } from '../../../src/editor/core/modules/chart-graphics/layout/ChartGraphicFragmentPolicy'
import { resolveChartMedicalMarkCoordinate } from '../../../src/editor/core/modules/chart-graphics/render/ChartGraphicMedicalRenderPolicy'
import { resolveDentalToothPathGeometry } from '../../../src/editor/core/modules/chart-graphics/render/DentalChartRenderPolicy'
import {
  resolveEcgLeadLayoutList,
  resolveEcgSeriesRenderContext
} from '../../../src/editor/core/modules/chart-graphics/render/ChartGraphicEcgRenderPolicy'

type CanvasPixelStats = {
  nonWhite: number
  total: number
}

type ChartGraphicPresetCase = {
  kind: ChartGraphicKind
  presetId: string
}

const PRESET_CASE_LIST: ChartGraphicPresetCase[] = [
  { kind: 'line', presetId: 'common.line.basic' },
  { kind: 'vital-signs', presetId: 'medical.vitalSigns.standard' },
  { kind: 'ecg', presetId: 'medical.ecg.standard' },
  { kind: 'menstrual', presetId: 'medical.menstrual.standard' },
  { kind: 'partogram', presetId: 'medical.partogram.standard' },
  { kind: 'dental', presetId: 'medical.dental.fdi' },
  { kind: 'anesthesia', presetId: 'medical.anesthesia.standard' }
]

function getDentalTestGeometry(width = 560) {
  const startX = 24
  const toothWidth = Math.max(22, (width - startX * 2) / 16 - 4)
  return resolveDentalToothPathGeometry({
    toothCode: '18',
    x: startX,
    y: 56,
    width: toothWidth,
    height: 58,
    isTopRow: true
  })
}

function getDentalTestSurfacePoint() {
  const surface = getDentalTestGeometry().surfaceList.find(
    item => item.surface === 'buccal'
  )!
  return surface.pointList.reduce(
    (sum, point) => ({
      x: sum.x + point.x / surface.pointList.length,
      y: sum.y + point.y / surface.pointList.length
    }),
    { x: 0, y: 0 }
  )
}

function getDentalTestToothPoint() {
  return { x: 27, y: 64 }
}

function getDraw(editor: Editor) {
  return (editor as unknown as {
    draw: {
      getServices(): {
        renderInvalidationManager: {
          flushScheduledFrameRender(): void
        }
      }
    }
  }).draw
}

function resetDocument(editor: Editor) {
  editor.command.executeSetValue({
    main: [{ value: '图形测试\n' }]
  })
  editor.command.executeSetRange(0, 0)
  getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
}

function findChartGraphicElementList(editor: Editor) {
  return editor.command
    .getValue()
    .data.main.filter(element => element.type === ElementType.CHART_GRAPHIC)
}

function readCanvasPixelStats(canvas: HTMLCanvasElement): CanvasPixelStats {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('canvas 2d context not found')
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
  return {
    nonWhite,
    total: image.length / 4
  }
}

function readDataUrlPixelStats(
  win: Window,
  dataUrl: string
): Cypress.Chainable<CanvasPixelStats> {
  return cy.wrap(
    new Cypress.Promise<CanvasPixelStats>((resolve, reject) => {
      const image = new win.Image()
      image.onload = () => {
        const canvas = win.document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas 2d context not found'))
          return
        }
        ctx.drawImage(image, 0, 0)
        resolve(readCanvasPixelStats(canvas))
      }
      image.onerror = () => reject(new Error('failed to decode exported image'))
      image.src = dataUrl
    })
  )
}

function readBlobPrefix(blob: Blob, length: number) {
  return new Cypress.Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer)
      resolve(String.fromCharCode(...bytes.slice(0, length)))
    }
    reader.readAsArrayBuffer(blob)
  })
}

function createPrintPosition(element: any, x: number, y: number) {
  const width = element.width || element.chartGraphic?.size.width || 10
  const height = element.height || element.chartGraphic?.size.height || 16
  return {
    pageNo: 0,
    index: 0,
    value: element.value || '',
    element,
    rowIndex: 0,
    rowNo: 0,
    ascent: 0,
    lineHeight: height,
    left: x,
    metrics: { width, height },
    coordinate: {
      leftTop: [x, y],
      leftBottom: [x, y + height],
      rightTop: [x + width, y],
      rightBottom: [x + width, y + height]
    }
  } as any
}

function findChartGraphicPosition(editor: Editor, id: string) {
  const draw = (editor as any).draw
  return draw
    .getCoordinate()
    .getOriginalPositionList()
    .find((position: any) => position.element?.id === id)
}

function findChartGraphicPositionList(editor: Editor, id: string) {
  const draw = (editor as any).draw
  return draw
    .getCoordinate()
    .getOriginalPositionList()
    .filter((position: any) => position.element?.id === id)
}

function createMouseEventAtPosition(
  editor: Editor,
  position: any,
  type = 'click'
) {
  const container = editor.command.getContainer()
  const win = container.ownerDocument.defaultView!
  const draw = (editor as any).draw
  const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
    position.pageNo
  ]
  const pageRect = pageWrapper.getBoundingClientRect()
  const { leftTop, rightTop } = position.coordinate

  return new win.MouseEvent(type, {
    bubbles: true,
    clientX: pageRect.left + (leftTop[0] + rightTop[0]) / 2,
    clientY: pageRect.top + leftTop[1] + position.lineHeight / 2
  })
}

function createMouseEventAtLocalOffset(
  editor: Editor,
  position: any,
  offsetX: number,
  offsetY: number,
  type = 'click',
  init: MouseEventInit = {}
) {
  const container = editor.command.getContainer()
  const win = container.ownerDocument.defaultView!
  const draw = (editor as any).draw
  const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
    position.pageNo
  ]
  const pageRect = pageWrapper.getBoundingClientRect()

  return new win.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: type === 'contextmenu' ? 2 : 0,
    buttons: type === 'mouseup' ? 0 : type === 'contextmenu' ? 2 : 1,
    clientX: pageRect.left + position.coordinate.leftTop[0] + offsetX,
    clientY: pageRect.top + position.coordinate.leftTop[1] + offsetY,
    ...init
  })
}

function dispatchChartPointDrag(payload: {
  editor: Editor
  position: any
  from: { x: number; y: number }
  to: { x: number; y: number }
  intermediateList?: Array<{ x: number; y: number }>
}) {
  const { editor, position, from, to, intermediateList = [] } = payload
  const draw = (editor as any).draw
  const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
    position.pageNo
  ]
  pageWrapper.dispatchEvent(
    createMouseEventAtLocalOffset(editor, position, from.x, from.y, 'mousedown')
  )
  for (const point of [...intermediateList, to]) {
    pageWrapper.dispatchEvent(
      createMouseEventAtLocalOffset(
        editor,
        position,
        point.x,
        point.y,
        'mousemove'
      )
    )
  }
  pageWrapper.dispatchEvent(
    createMouseEventAtLocalOffset(editor, position, to.x, to.y, 'mouseup')
  )
}

function resolveTestPublicAssetUrl(path: string) {
  const pathname = window.location.pathname
  const appBase = pathname.includes('/canvas-editor/')
    ? `${window.location.origin}/canvas-editor/`
    : `${window.location.origin}/`
  return new URL(path, appBase).href
}

describe('chart graphics', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('inserts all P0 chart graphic presets and keeps structured models', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const insertedIdList = PRESET_CASE_LIST.map(({ kind, presetId }) => {
        const id = editor.command.executeInsertChartGraphic({ kind, presetId })
        expect(id).to.be.a('string')
        const chart = editor.command.getChartGraphic(id!)
        expect(chart?.kind).to.eq(kind)
        expect(chart?.presetId).to.eq(presetId)
        expect(chart?.size.width).to.be.greaterThan(0)
        expect(chart?.size.height).to.be.greaterThan(0)
        return id
      })

      const chartElementList = findChartGraphicElementList(editor)
      expect(chartElementList).to.have.length(PRESET_CASE_LIST.length)
      insertedIdList.forEach(id => {
        expect(chartElementList.some(element => element.id === id)).to.eq(true)
      })
      expect(chartElementList.every(element => !!element.chartGraphic)).to.eq(true)
      expect(
        chartElementList.find(element => element.chartGraphic?.kind === 'dental')
          ?.chartGraphic?.dental?.teeth
      ).to.have.length(32)
      expect(
        chartElementList.find(element => element.chartGraphic?.kind === 'menstrual')
          ?.chartGraphic?.regions
      ).to.have.length(1)
      expect(
        chartElementList.find(element => element.chartGraphic?.kind === 'partogram')
          ?.chartGraphic?.marks
      ).to.have.length(1)
      expect(
        chartElementList
          .find(element => element.chartGraphic?.kind === 'partogram')
          ?.chartGraphic?.series?.map(series => series.id)
      ).to.include.members(['alert-line', 'action-line'])
    })
  })

  it('updates chart graphic model by id', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic'
      })
      expect(id).to.be.a('string')

      const updated = editor.command.executeUpdateChartGraphic(id!, {
        title: '更新后的图表',
        size: {
          width: 480,
          height: 240
        }
      })

      expect(updated).to.eq(true)
      const chart = editor.command.getChartGraphic(id!)
      expect(chart?.title).to.eq('更新后的图表')
      expect(chart?.size).to.include({
        width: 480,
        height: 240
      })

      const chartElement = findChartGraphicElementList(editor)[0]
      expect(chartElement).to.include({
        width: 480,
        height: 240
      })
    })
  })

  it('applies chart graphic presets by id', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const lineId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'line-source',
          refreshMode: 'manual'
        }
      })
      expect(lineId).to.be.a('string')

      expect(
        editor.command.executeApplyChartGraphicPreset(
          lineId!,
          'medical.partogram.standard'
        )
      ).to.eq(true)

      const partogram = editor.command.getChartGraphic(lineId!)
      expect(partogram?.kind).to.eq('partogram')
      expect(partogram?.presetId).to.eq('medical.partogram.standard')
      expect(partogram?.title).to.eq('产程图')
      expect(partogram?.size).to.include({
        width: 720,
        height: 420
      })
      expect(partogram?.series?.map(series => series.id)).to.include.members([
        'cervix',
        'alert-line',
        'action-line'
      ])
      expect(partogram?.marks).to.have.length(1)
      expect(partogram?.source).to.eq(undefined)

      const chartElement = findChartGraphicElementList(editor).find(
        element => element.id === lineId
      )
      expect(chartElement).to.include({
        width: 720,
        height: 420
      })

      const vitalSignsId = editor.command.executeInsertChartGraphic({
        kind: 'vital-signs',
        presetId: 'medical.vitalSigns.standard',
        source: {
          sourceId: 'ward-vitals',
          refreshMode: 'manual'
        }
      })

      expect(
        editor.command.executeApplyChartGraphicPreset(
          vitalSignsId!,
          'medical.vitalSigns.standard'
        )
      ).to.eq(true)
      expect(editor.command.getChartGraphic(vitalSignsId!)?.source).to.include({
        sourceId: 'ward-vitals',
        refreshMode: 'manual'
      })
      expect(
        editor.command.executeApplyChartGraphicPreset(lineId!, 'missing-preset')
      ).to.eq(false)
    })
  })

  it('registers chart graphic presets and restores overridden presets', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const builtinLinePresetCount =
        editor.command.getChartGraphicPresetList('line').length

      const unregisterCustom = editor.command.registerChartGraphicPreset({
        id: 'custom.line.monitoring',
        kind: 'line',
        name: '监护趋势图',
        version: '1.0.0',
        defaultSize: {
          width: 610,
          height: 280
        },
        defaultCoordinate: {
          xAxis: {
            type: 'linear',
            min: 0,
            max: 24
          },
          yAxis: {
            type: 'linear',
            min: 80,
            max: 100
          }
        },
        defaultSeries: [
          {
            id: 'spo2',
            name: '血氧',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 0, y: 98 },
              { x: 8, y: 97 },
              { x: 16, y: 99 }
            ]
          }
        ]
      })

      const linePresetList = editor.command.getChartGraphicPresetList('line')
      expect(linePresetList).to.have.length(builtinLinePresetCount + 1)
      expect(
        linePresetList.some(preset => preset.id === 'custom.line.monitoring')
      ).to.eq(true)

      const customId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'custom.line.monitoring'
      })
      expect(customId).to.be.a('string')
      const customChart = editor.command.getChartGraphic(customId!)
      expect(customChart?.presetId).to.eq('custom.line.monitoring')
      expect(customChart?.title).to.eq('监护趋势图')
      expect(customChart?.size).to.include({
        width: 610,
        height: 280
      })
      expect(customChart?.series?.[0].id).to.eq('spo2')

      const unregisterOverride = editor.command.registerChartGraphicPreset({
        id: 'common.line.basic',
        kind: 'line',
        name: '覆盖折线图',
        version: '2.0.0',
        defaultSize: {
          width: 480,
          height: 210
        },
        defaultSeries: [
          {
            id: 'override',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 0, y: 0 },
              { x: 1, y: 1 }
            ]
          }
        ]
      })

      expect(
        editor.command
          .getChartGraphicPresetList('line')
          .find(preset => preset.id === 'common.line.basic')?.name
      ).to.eq('覆盖折线图')

      const overriddenId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic'
      })
      expect(overriddenId).to.be.a('string')
      const overriddenChart = editor.command.getChartGraphic(overriddenId!)
      expect(overriddenChart?.title).to.eq('覆盖折线图')
      expect(overriddenChart?.size).to.include({
        width: 480,
        height: 210
      })
      expect(overriddenChart?.series?.[0].id).to.eq('override')

      unregisterOverride()

      expect(
        editor.command
          .getChartGraphicPresetList('line')
          .find(preset => preset.id === 'common.line.basic')?.name
      ).to.eq('基础折线图')

      const restoredId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic'
      })
      expect(restoredId).to.be.a('string')
      const restoredChart = editor.command.getChartGraphic(restoredId!)
      expect(restoredChart?.title).to.eq('基础折线图')
      expect(restoredChart?.size).to.include({
        width: 520,
        height: 260
      })
      expect(restoredChart?.series?.[0].id).to.eq('series-1')

      unregisterCustom()

      expect(
        editor.command
          .getChartGraphicPresetList()
          .some(preset => preset.id === 'custom.line.monitoring')
      ).to.eq(false)

      const presetCount = editor.command.getChartGraphicPresetList().length
      const unregisterInvalid = editor.command.registerChartGraphicPreset({
        id: 'custom.line.invalid',
        kind: 'line',
        name: '非法预设',
        version: '1.0.0',
        defaultSize: {
          width: 0,
          height: 200
        }
      })
      expect(editor.command.getChartGraphicPresetList()).to.have.length(
        presetCount
      )
      unregisterInvalid()

      const mismatchedId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'medical.dental.fdi'
      })
      const mismatchedChart = editor.command.getChartGraphic(mismatchedId!)
      expect(mismatchedChart?.kind).to.eq('line')
      expect(mismatchedChart?.presetId).to.eq('common.line.basic')
      expect(mismatchedChart?.title).to.eq('基础折线图')
      expect(mismatchedChart?.dental).to.eq(undefined)
    })
  })

  it('checks chart preset host version and feature compatibility', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const unregister = editor.command.registerChartGraphicPreset({
        id: 'custom.line.compatible',
        kind: 'line',
        name: '兼容性预设',
        version: '2.1.0',
        defaultSize: {
          width: 320,
          height: 160
        },
        defaultSeries: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ],
        compatibility: {
          minHostVersion: '1.2.0',
          maxHostVersion: '3.0.0',
          requiredFeatures: ['internal-editing', 'custom-dashboard']
        }
      })

      const incompatible =
        editor.command.getChartGraphicPresetCompatibility(
          'custom.line.compatible',
          {
            version: '1.0.0',
            features: ['internal-editing']
          }
        )
      expect(incompatible).to.deep.include({
        compatible: false,
        presetFound: true,
        presetId: 'custom.line.compatible',
        presetVersion: '2.1.0'
      })
      expect(incompatible.warnings).to.include.members([
        'chart.preset.hostVersionTooLow',
        'chart.preset.requiredFeatureMissing'
      ])
      expect(
        editor.command.getChartGraphicPresetCompatibility(
          'custom.line.compatible',
          {
            version: '2.0.0',
            features: ['custom-dashboard']
          }
        )
      ).to.deep.include({
        compatible: true,
        presetFound: true
      })
      expect(
        editor.command.getChartGraphicPresetCompatibility('missing-preset')
      ).to.deep.include({
        compatible: false,
        presetFound: false
      })

      unregister()
    })
  })

  it('tracks chart preset versions and upgrades instances conservatively', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const unregisterV1 = editor.command.registerChartGraphicPreset({
        id: 'custom.line.upgradeable',
        kind: 'line',
        name: '升级治理折线图',
        version: '1.0.0',
        defaultSize: {
          width: 360,
          height: 180
        },
        defaultSeries: [
          {
            id: 'template-series',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ],
        defaultTheme: {
          palette: ['#111827'],
          textColor: '#111827'
        },
        defaultSource: {
          sourceId: 'template-v1',
          refreshMode: 'manual',
          fieldMap: {
            x: 'day',
            y: 'temperature'
          }
        }
      })

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'custom.line.upgradeable',
        title: '患者体温',
        series: [
          {
            id: 'patient-temperature',
            name: '患者体温',
            type: 'line',
            data: [
              { x: 1, y: 36.8 },
              { x: 2, y: 37.1 }
            ]
          }
        ],
        source: {
          sourceId: 'ward-vitals',
          refreshMode: 'manual',
          fieldMap: {
            y: 'value'
          }
        },
        theme: {
          textColor: '#334155'
        }
      })

      expect(editor.command.getChartGraphic(chartId!)?.presetVersion).to.eq(
        '1.0.0'
      )

      const unregisterV2 = editor.command.registerChartGraphicPreset({
        id: 'custom.line.upgradeable',
        kind: 'line',
        name: '升级治理折线图',
        version: '1.2.0',
        defaultSize: {
          width: 420,
          height: 220
        },
        defaultSeries: [
          {
            id: 'new-template-series',
            type: 'line',
            data: [{ x: 1, y: 9 }]
          }
        ],
        defaultTheme: {
          palette: ['#0f766e'],
          textColor: '#0f172a',
          backgroundColor: '#f8fafc'
        },
        defaultInteraction: {
          coordinateLocked: true
        },
        defaultPagination: {
          mode: 'time-window',
          windowSize: 3,
          pageBreakBetweenFragments: true
        },
        defaultSource: {
          sourceId: 'template-v2',
          refreshMode: 'on-print',
          fieldMap: {
            x: 'recordedAt',
            y: 'temperature',
            label: 'remark'
          }
        }
      })

      expect(
        editor.command.getChartGraphicPresetUpgradeInfo(chartId!)
      ).to.deep.include({
        upgradable: true,
        presetFound: true,
        kindMatched: true,
        presetId: 'custom.line.upgradeable',
        currentVersion: '1.0.0',
        latestVersion: '1.2.0'
      })
      expect(editor.command.executeUpgradeChartGraphicPreset(chartId!)).to.eq(
        true
      )

      const upgraded = editor.command.getChartGraphic(chartId!)!
      expect(upgraded.presetVersion).to.eq('1.2.0')
      expect(upgraded.title).to.eq('患者体温')
      expect(upgraded.series?.[0].id).to.eq('patient-temperature')
      expect(upgraded.series?.[0].data).to.deep.eq([
        { x: 1, y: 36.8 },
        { x: 2, y: 37.1 }
      ])
      expect(upgraded.source).to.deep.include({
        sourceId: 'ward-vitals',
        refreshMode: 'manual'
      })
      expect(upgraded.source?.fieldMap).to.deep.eq({
        x: 'day',
        y: 'value',
        label: 'remark'
      })
      expect(upgraded.theme).to.deep.include({
        textColor: '#334155',
        backgroundColor: '#f8fafc'
      })
      expect(upgraded.interaction?.coordinateLocked).to.eq(true)
      expect(upgraded.pagination).to.deep.include({
        mode: 'time-window',
        windowSize: 3,
        pageBreakBetweenFragments: true
      })

      const latestInfo = editor.command.getChartGraphicPresetUpgradeInfo(
        chartId!
      )
      expect(latestInfo).to.deep.include({
        upgradable: false,
        currentVersion: '1.2.0',
        latestVersion: '1.2.0'
      })
      expect(latestInfo.warnings).to.include('chart.preset.alreadyLatest')
      expect(editor.command.executeUpgradeChartGraphicPreset(chartId!)).to.eq(
        false
      )

      unregisterV2()
      unregisterV1()
    })
  })

  it('audits and upgrades chart preset versions across the document', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const unregisterV1 = editor.command.registerChartGraphicPreset({
        id: 'custom.line.batchUpgrade',
        kind: 'line',
        name: '批量升级折线图',
        version: '1.0.0',
        defaultSize: {
          width: 320,
          height: 160
        },
        defaultSeries: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ],
        defaultTheme: {
          textColor: '#111827'
        }
      })

      const firstId = editor.command.executeInsertChartGraphic({
        id: 'batch-upgrade-first',
        kind: 'line',
        presetId: 'custom.line.batchUpgrade',
        series: [
          {
            id: 'first-series',
            type: 'line',
            data: [{ x: 1, y: 2 }]
          }
        ]
      })
      const secondId = editor.command.executeInsertChartGraphic({
        id: 'batch-upgrade-second',
        kind: 'line',
        presetId: 'custom.line.batchUpgrade'
      })
      const readonlyId = editor.command.executeInsertChartGraphic({
        id: 'batch-upgrade-readonly',
        kind: 'line',
        presetId: 'custom.line.batchUpgrade',
        interaction: {
          readonly: true
        }
      })

      const unregisterV2 = editor.command.registerChartGraphicPreset({
        id: 'custom.line.batchUpgrade',
        kind: 'line',
        name: '批量升级折线图',
        version: '1.1.0',
        defaultSize: {
          width: 340,
          height: 180
        },
        defaultSeries: [
          {
            id: 'series-v2',
            type: 'line',
            data: [{ x: 1, y: 9 }]
          }
        ],
        defaultTheme: {
          textColor: '#0f172a',
          backgroundColor: '#f8fafc'
        },
        defaultPagination: {
          mode: 'time-window',
          windowSize: 2
        }
      })

      const auditList = editor.command
        .getChartGraphicPresetUpgradeInfoList()
        .filter(info => info.presetId === 'custom.line.batchUpgrade')
      expect(auditList.map(info => info.chartId)).to.have.members([
        firstId,
        secondId,
        readonlyId
      ])
      expect(auditList.every(info => info.upgradable)).to.eq(true)

      const result = editor.command.executeUpgradeChartGraphicPresets()
      expect(result).to.deep.include({
        checked: 3,
        upgraded: 2,
        skipped: 1,
        failed: 0
      })
      expect(result.upgradedChartIds).to.have.members([firstId, secondId])
      expect(result.skippedChartIds).to.deep.eq([readonlyId])
      expect(result.failedChartIds).to.deep.eq([])
      expect(result.infos.map(info => info.chartId)).to.have.members([
        firstId,
        secondId,
        readonlyId
      ])

      const firstChart = editor.command.getChartGraphic(firstId!)!
      const secondChart = editor.command.getChartGraphic(secondId!)!
      const readonlyChart = editor.command.getChartGraphic(readonlyId!)!
      expect(firstChart.presetVersion).to.eq('1.1.0')
      expect(secondChart.presetVersion).to.eq('1.1.0')
      expect(readonlyChart.presetVersion).to.eq('1.0.0')
      expect(firstChart.series?.[0].id).to.eq('first-series')
      expect(firstChart.theme?.backgroundColor).to.eq('#f8fafc')
      expect(secondChart.pagination?.windowSize).to.eq(2)

      const afterAudit = editor.command
        .getChartGraphicPresetUpgradeInfoList()
        .filter(info => info.presetId === 'custom.line.batchUpgrade')
      expect(
        afterAudit.find(info => info.chartId === firstId)?.upgradable
      ).to.eq(false)
      expect(
        afterAudit.find(info => info.chartId === readonlyId)?.upgradable
      ).to.eq(true)

      unregisterV2()
      unregisterV1()
    })
  })

  it('isolates chart models and preserves them through JSON serialization', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const inputSeries = [
        {
          id: 'temperature',
          name: '体温',
          type: 'line' as const,
          symbol: 'circle' as const,
          data: [
            { x: '2026-07-13T08:00:00', y: 36.8 },
            { x: '2026-07-13T12:00:00', y: 37.2 }
          ]
        }
      ]
      const chartId = editor.command.executeInsertChartGraphic({
        id: 'chart-json-round-trip',
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'JSON round trip',
        width: 640,
        height: 320,
        series: inputSeries,
        marks: [
          {
            id: 'admission',
            type: 'event',
            x: '2026-07-13T09:00:00',
            y: 37,
            label: '入院'
          }
        ],
        regions: [
          {
            id: 'warning-range',
            type: 'warning',
            xStart: '2026-07-13T08:00:00',
            xEnd: '2026-07-13T12:00:00',
            yStart: 37,
            yEnd: 38,
            label: '关注区间',
            color: '#fee2e2'
          }
        ],
        annotations: [
          {
            id: 'note',
            x: '2026-07-13T12:00:00',
            y: 37.2,
            text: '复测'
          }
        ],
        source: {
          sourceId: 'ward-vitals',
          fieldMap: {
            temperature: 'vitals.temperature'
          },
          refreshMode: 'manual',
          version: '2026-07-13'
        },
        theme: {
          palette: ['#2563eb', '#dc2626'],
          fontFamily: 'Arial',
          textColor: '#111827',
          gridColor: '#d1d5db',
          backgroundColor: '#ffffff'
        },
        interaction: {
          readonly: true,
          activeSeriesId: 'temperature'
        },
        fallback: {
          svg: '<svg data-chart-graphic="1"></svg>',
          png: 'data:image/png;base64,AA=='
        }
      })
      expect(chartId).to.eq('chart-json-round-trip')

      inputSeries[0].data[0].y = 99
      const firstRead = editor.command.getChartGraphic(chartId!)
      expect(firstRead?.series?.[0].data[0]).to.deep.eq({
        x: '2026-07-13T08:00:00',
        y: 36.8
      })
      const expectedChart = JSON.parse(JSON.stringify(firstRead))

      firstRead!.title = 'mutated outside command'
      firstRead!.series![0].data[0] = {
        x: '2026-07-13T08:00:00',
        y: 88
      }
      expect(editor.command.getChartGraphic(chartId!)?.title).to.eq(
        'JSON round trip'
      )
      expect(editor.command.getChartGraphic(chartId!)?.series?.[0].data[0]).to
        .deep.eq({
          x: '2026-07-13T08:00:00',
          y: 36.8
        })

      const serializedData = JSON.parse(
        JSON.stringify(editor.command.getValue().data)
      )
      editor.command.executeSetValue(serializedData)
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const restoredChart = editor.command.getChartGraphic(chartId!)
      expect(restoredChart).to.deep.eq(expectedChart)
      expect(restoredChart?.title).to.eq('JSON round trip')
      expect(restoredChart?.source?.fieldMap).to.deep.eq({
        temperature: 'vitals.temperature'
      })
      expect(restoredChart?.fallback).to.deep.eq({
        svg: '<svg data-chart-graphic="1"></svg>',
        png: 'data:image/png;base64,AA=='
      })
    })
  })

  it('recovers chart graphics from clipboard html fallback payloads', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        id: 'chart-clipboard-source',
        kind: 'line',
        presetId: 'common.line.basic',
        title: '剪贴板恢复图表'
      })
      expect(chartId).to.be.a('string')
      const element = findChartGraphicElementList(editor)[0]
      const clipboardDom = createDomFromElementList([element])
      document.body.append(clipboardDom)
      const html = clipboardDom.innerHTML
      clipboardDom.remove()
      expect(html).to.contain('data-ce-chart-graphic-payload')

      const restoredElementList = getElementListByHTML(html, {
        innerWidth: 720
      })
      expect(restoredElementList).to.have.length(1)
      expect(restoredElementList[0].type).to.eq(ElementType.CHART_GRAPHIC)
      expect(restoredElementList[0].chartGraphic?.title).to.eq(
        '剪贴板恢复图表'
      )

      resetDocument(editor)
      editor.command.executeInsertElementList(restoredElementList)
      expect(editor.command.getChartGraphic('chart-clipboard-source')?.title).to.eq(
        '剪贴板恢复图表'
      )

      const restoredElement = findChartGraphicElementList(editor)[0]
      const svg = createPrintSvgChartGraphic(
        createPrintPosition(restoredElement, 0, 0)
      )
      expect(svg).to.contain('data-ce-chart-graphic-payload')
      const restoredFromSvgList = getElementListByHTML(`<svg>${svg}</svg>`, {
        innerWidth: 720
      })
      expect(restoredFromSvgList[0].type).to.eq(ElementType.CHART_GRAPHIC)
      expect(restoredFromSvgList[0].chartGraphic?.title).to.eq(
        '剪贴板恢复图表'
      )
    })
  })

  it('tracks chart graphic internal editing state by command', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic'
      })
      expect(chartId).to.be.a('string')
      expect(
        editor.command.executeSetChartGraphicInternalEditing(chartId!, {
          mode: 'point',
          seriesId: 'series-1',
          dataIndex: 1
        })
      ).to.eq(true)
      expect(editor.command.getChartGraphicInternalEditing(chartId!)).to.deep.eq({
        mode: 'point',
        seriesId: 'series-1',
        dataIndex: 1
      })
      expect(
        editor.command.executeSetChartGraphicInternalEditing(chartId!, {
          mode: 'point',
          seriesId: 'missing',
          dataIndex: 0
        })
      ).to.eq(false)
      expect(
        editor.command.executeSetChartGraphicInternalEditing(chartId!, null)
      ).to.eq(true)
      expect(editor.command.getChartGraphicInternalEditing(chartId!)).to.eq(null)

      expect(
        editor.command.executeUpdateChartGraphic(chartId!, {
          interaction: {
            readonly: true
          }
        })
      ).to.eq(true)
      expect(
        editor.command.executeSetChartGraphicInternalEditing(chartId!, {
          mode: 'point',
          seriesId: 'series-1',
          dataIndex: 0
        })
      ).to.eq(false)
      expect(
        editor.command.executeSetChartGraphicInternalEditing(chartId!, {
          mode: 'readonly-preview'
        })
      ).to.eq(true)
      expect(editor.command.getChartGraphicInternalEditing(chartId!)).to.deep.eq({
        mode: 'readonly-preview'
      })
    })
  })

  it('deletes selected chart internal targets in bulk', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Bulk Internal Selection',
        series: [
          {
            id: 'series-1',
            type: 'line',
            data: [
              { x: 1, y: 1 },
              { x: 2, y: 2 },
              { x: 3, y: 3 }
            ]
          }
        ],
        marks: [
          { id: 'mark-1', type: 'event', x: 1, y: 1, label: '保留' },
          { id: 'mark-2', type: 'event', x: 2, y: 2, label: '删除' }
        ],
        regions: [
          { id: 'region-1', type: 'range', xStart: 1, xEnd: 2 },
          { id: 'region-2', type: 'range', xStart: 2, xEnd: 3 }
        ],
        annotations: [
          { id: 'note-1', x: 1, y: 1, text: '保留' },
          { id: 'note-2', x: 2, y: 2, text: '删除' }
        ]
      })
      expect(chartId).to.be.a('string')
      const selection = [
        { target: 'series-point' as const, seriesId: 'series-1', dataIndex: 1 },
        { target: 'mark' as const, markId: 'mark-2' },
        { target: 'region' as const, regionId: 'region-1' },
        { target: 'annotation' as const, annotationId: 'note-2' }
      ]
      expect(
        editor.command.executeSetChartGraphicInternalSelection(
          chartId!,
          selection
        )
      ).to.eq(true)
      expect(editor.command.getChartGraphicInternalSelection(chartId!)).to.deep.eq(
        selection
      )
      expect(editor.command.executeDeleteChartGraphicInternalSelection(chartId!)).to.eq(
        true
      )

      const chart = editor.command.getChartGraphic(chartId!)
      expect(chart?.series?.[0].data).to.deep.eq([
        { x: 1, y: 1 },
        { x: 3, y: 3 }
      ])
      expect(chart?.marks?.map(mark => mark.id)).to.deep.eq(['mark-1'])
      expect(chart?.regions?.map(region => region.id)).to.deep.eq(['region-2'])
      expect(chart?.annotations?.map(annotation => annotation.id)).to.deep.eq([
        'note-1'
      ])
      expect(editor.command.getChartGraphicInternalSelection(chartId!)).to.deep.eq(
        []
      )
      expect(
        editor.command.executeSetChartGraphicInternalSelection(chartId!, [
          { target: 'mark', markId: 'missing' }
        ])
      ).to.eq(false)
    })
  })

  it('clears selected dental tooth and surface states in bulk', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const dentalId = editor.command.executeInsertChartGraphic({
        kind: 'dental',
        presetId: 'medical.dental.fdi'
      })
      expect(dentalId).to.be.a('string')
      expect(
        editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '18', {
          status: ['missing'],
          surfaces: {
            buccal: ['caries'],
            occlusal: ['filled']
          }
        })
      ).to.eq(true)
      expect(
        editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '17', {
          status: ['implant'],
          surfaces: {
            buccal: ['caries']
          }
        })
      ).to.eq(true)

      expect(
        editor.command.executeSetChartGraphicInternalSelection(dentalId!, [
          { target: 'dental-surface', toothCode: '18', dentalSurface: 'buccal' },
          { target: 'dental-tooth', toothCode: '17' }
        ])
      ).to.eq(true)
      expect(
        editor.command.executeDeleteChartGraphicInternalSelection(dentalId!)
      ).to.eq(true)

      const dental = editor.command.getChartGraphic(dentalId!)?.dental
      const tooth18 = dental?.teeth.find(tooth => tooth.code === '18')
      const tooth17 = dental?.teeth.find(tooth => tooth.code === '17')
      expect(tooth18?.status).to.deep.eq(['missing'])
      expect(tooth18?.surfaces).to.deep.eq({
        occlusal: ['filled']
      })
      expect(tooth17?.status).to.eq(undefined)
      expect(tooth17?.surfaces).to.eq(undefined)
    })
  })

  it('selects chart graphics as resizable media and keeps model size in sync', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic'
      })
      expect(id).to.be.a('string')

      const position = findChartGraphicPosition(editor, id!)
      const context = editor.command.getPositionContextByEvent(
        createMouseEventAtPosition(editor, position)
      )
      expect(context?.element?.type).to.eq(ElementType.CHART_GRAPHIC)

      const draw = (editor as any).draw
      const element = draw.getObjectResolver().getElementList().find(
        item => item.id === id
      )!
      draw.getComponents().previewer.drawResizer(element, position)
      expect(
        editor.command
          .getContainer()
          .querySelector<HTMLElement>('.ce-resizer-selection')?.style.display
      ).to.eq('block')

      const originalSize = editor.command.getChartGraphic(id!)!.size
      const container = editor.command.getContainer()
      const ownerDocument = container.ownerDocument
      const MouseEventCtor = ownerDocument.defaultView!.MouseEvent
      const resizeHandle =
        container.querySelector<HTMLElement>('.resizer-handle.handle-4')
      expect(resizeHandle).to.exist
      resizeHandle!.dispatchEvent(
        new MouseEventCtor('mousedown', {
          bubbles: true,
          button: 0,
          clientX: 200,
          clientY: 100
        })
      )
      ownerDocument.dispatchEvent(
        new MouseEventCtor('mousemove', {
          bubbles: true,
          button: 0,
          clientX: 240,
          clientY: 120
        })
      )
      ownerDocument.dispatchEvent(
        new MouseEventCtor('mouseup', {
          bubbles: true,
          button: 0,
          clientX: 240,
          clientY: 120
        })
      )
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const resizedSize = editor.command.getChartGraphic(id!)!.size
      expect(resizedSize.width).to.be.greaterThan(originalSize.width)
      expect(resizedSize.height).to.be.greaterThan(originalSize.height)
      expect(element.width).to.eq(resizedSize.width)
      expect(element.height).to.eq(resizedSize.height)
      expect(syncChartGraphicElementSize(element)).to.eq(true)
      expect(editor.command.getChartGraphicSnapshot(id!)).to.include(resizedSize)

      editor.command.executeUndo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(editor.command.getChartGraphic(id!)?.size).to.deep.eq(originalSize)

      editor.command.executeRedo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(editor.command.getChartGraphic(id!)?.size).to.deep.eq(resizedSize)
    })
  })

  it('deletes whole chart graphics and restores them through undo', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)
      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Delete Undo Chart'
      })
      expect(chartId).to.be.a('string')

      const position = findChartGraphicPosition(editor, chartId!)
      expect(position).to.exist
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        position.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtPosition(editor, position, 'mousedown')
      )
      pageWrapper.dispatchEvent(
        createMouseEventAtPosition(editor, position, 'mouseup')
      )
      const input = editor.command
        .getContainer()
        .querySelector<HTMLTextAreaElement>('.ce-inputarea')
      expect(input).to.exist
      const KeyboardEventCtor = input!.ownerDocument.defaultView!.KeyboardEvent
      input!.dispatchEvent(
        new KeyboardEventCtor('keydown', {
          key: 'Delete',
          bubbles: true,
          cancelable: true
        })
      )
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(editor.command.getChartGraphic(chartId!)).to.eq(null)

      editor.command.executeUndo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(editor.command.getChartGraphic(chartId!)?.title).to.eq(
        'Delete Undo Chart'
      )
    })
  })

  it('updates chart series marks regions and dental tooth state by id', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const partogramId = editor.command.executeInsertChartGraphic({
        kind: 'partogram',
        presetId: 'medical.partogram.standard'
      })
      expect(partogramId).to.be.a('string')

      expect(
        editor.command.executeUpdateChartGraphicSeries(partogramId!, 'cervix', {
          color: '#111827',
          data: [
            { x: 0, y: 3 },
            { x: 2, y: 5 },
            { x: 4, y: 7 }
          ]
        })
      ).to.eq(true)
      expect(
        editor.command.executeDeleteChartGraphicSeriesPoint(
          partogramId!,
          'cervix',
          1
        )
      ).to.eq(true)
      expect(
        editor.command.executeUpdateChartGraphicSeriesPoint(
          partogramId!,
          'cervix',
          1,
          { y: 8.5, label: '更新点位' }
        )
      ).to.eq(true)
      expect(
        editor.command.executeInsertChartGraphicSeriesPoint(partogramId!, 'cervix', {
          x: 3,
          y: 6,
          label: '插入点位'
        })
      ).to.eq(true)
      expect(
        editor.command.executeUpsertChartGraphicMark(partogramId!, {
          id: 'oxytocin',
          type: 'medication',
          x: 5,
          y: 6,
          label: '催产素'
        })
      ).to.eq(true)
      expect(
        editor.command.executeUpsertChartGraphicRegion(partogramId!, {
          id: 'second-stage',
          type: 'phase',
          xStart: 8,
          xEnd: 10,
          yStart: 0,
          yEnd: 10,
          label: '第二产程'
        })
      ).to.eq(true)
      expect(
        editor.command.executeUpsertChartGraphicAnnotation(partogramId!, {
          id: 'fetal-heart-note',
          x: 6,
          y: 8,
          text: '胎心复查'
        })
      ).to.eq(true)
      expect(
        editor.command.executeUpsertChartGraphicAnnotation(partogramId!, {
          id: 'fetal-heart-note',
          x: 7,
          y: 8.5,
          text: '胎心复查完成'
        })
      ).to.eq(true)
      expect(
        editor.command.executeDeleteChartGraphicMark(
          partogramId!,
          'rupture-of-membranes'
        )
      ).to.eq(true)
      expect(
        editor.command.executeDeleteChartGraphicRegion(
          partogramId!,
          'active-phase'
        )
      ).to.eq(true)
      expect(
        editor.command.executeDeleteChartGraphicAnnotation(
          partogramId!,
          'missing-annotation'
        )
      ).to.eq(false)

      const partogram = editor.command.getChartGraphic(partogramId!)
      const cervix = partogram?.series?.find(series => series.id === 'cervix')
      expect(cervix?.color).to.eq('#111827')
      expect(cervix?.data).to.have.length(3)
      expect(cervix?.data).to.deep.eq([
        { x: 0, y: 3 },
        { x: 3, y: 6, label: '插入点位' },
        { x: 4, y: 8.5, label: '更新点位' }
      ])
      expect(partogram?.marks?.map(mark => mark.id)).to.deep.eq(['oxytocin'])
      expect(partogram?.regions?.map(region => region.id)).to.deep.eq([
        'second-stage'
      ])
      expect(partogram?.annotations?.map(annotation => annotation.id)).to.deep.eq([
        'fetal-heart-note'
      ])
      expect(partogram?.annotations?.[0].text).to.eq('胎心复查完成')
      expect(
        editor.command.executeDeleteChartGraphicAnnotation(
          partogramId!,
          'fetal-heart-note'
        )
      ).to.eq(true)
      expect(editor.command.getChartGraphic(partogramId!)?.annotations).to.have.length(0)

      const dentalId = editor.command.executeInsertChartGraphic({
        kind: 'dental',
        presetId: 'medical.dental.fdi'
      })
      expect(dentalId).to.be.a('string')
      expect(
        editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '18', {
          status: ['missing', 'implant'],
          notes: '种植修复'
        })
      ).to.eq(true)
      expect(
        editor.command.executeUpdateChartGraphicDentalSurface(
          dentalId!,
          '18',
          'occlusal',
          ['filled']
        )
      ).to.eq(true)
      expect(
        editor.command.executeUpdateChartGraphicDentalSurface(
          dentalId!,
          '18',
          'mesial',
          ['caries']
        )
      ).to.eq(true)
      const dental = editor.command.getChartGraphic(dentalId!)
      const tooth18 = dental?.dental?.teeth.find(tooth => tooth.code === '18')
      expect(tooth18?.status).to.deep.eq(['missing', 'implant'])
      expect(tooth18?.notes).to.eq('种植修复')
      expect(tooth18?.surfaces?.occlusal).to.deep.eq(['filled'])
      expect(tooth18?.surfaces?.mesial).to.deep.eq(['caries'])
      expect(
        editor.command.executeUpdateChartGraphicDentalSurface(
          dentalId!,
          '18',
          'mesial',
          null
        )
      ).to.eq(true)
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '18'
        )?.surfaces?.mesial
      ).to.eq(undefined)

      expect(
        editor.command.executeUpdateChartGraphicSeries(partogramId!, 'missing', {
          color: '#000000'
        })
      ).to.eq(false)
      expect(
        editor.command.executeDeleteChartGraphicSeriesPoint(
          partogramId!,
          'cervix',
          99
        )
      ).to.eq(false)
      expect(
        editor.command.executeInsertChartGraphicSeriesPoint(partogramId!, 'missing', {
          x: 1,
          y: 2
        })
      ).to.eq(false)
      expect(
        editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '99', {
          notes: '不存在'
        })
      ).to.eq(false)
      expect(
        editor.command.executeUpdateChartGraphicDentalSurface(
          dentalId!,
          '99',
          'occlusal',
          ['filled']
        )
      ).to.eq(false)

      expect(
        editor.command.executeToggleChartGraphicDentalToothStatus(
          dentalId!,
          '17',
          'caries'
        )
      ).to.eq(true)
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '17'
        )?.status
      ).to.deep.eq(['caries'])
      expect(
        editor.command.executeToggleChartGraphicDentalToothStatus(
          dentalId!,
          '17',
          'caries'
        )
      ).to.eq(true)
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '17'
        )?.status
      ).to.eq(undefined)

      expect(
        editor.command.executeToggleChartGraphicDentalSurfaceStatus(
          dentalId!,
          '16',
          'occlusal',
          'filled'
        )
      ).to.eq(true)
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '16'
        )?.surfaces?.occlusal
      ).to.deep.eq(['filled'])
      expect(
        editor.command.executeToggleChartGraphicDentalSurfaceStatus(
          dentalId!,
          '16',
          'occlusal',
          'filled'
        )
      ).to.eq(true)
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '16'
        )?.surfaces?.occlusal
      ).to.eq(undefined)
      expect(
        editor.command.executeToggleChartGraphicDentalSurfaceStatus(
          dentalId!,
          '99',
          'occlusal',
          'filled'
        )
      ).to.eq(false)
    })
  })

  it('provides complete vital signs partogram and anesthesia preset semantics', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const vitalSignsId = editor.command.executeInsertChartGraphic({
        kind: 'vital-signs',
        presetId: 'medical.vitalSigns.standard'
      })
      const vitalSigns = editor.command.getChartGraphic(vitalSignsId!)!
      expect(vitalSigns.series?.map(series => series.id)).to.deep.eq([
        'temperature',
        'pulse',
        'respiration'
      ])
      expect(vitalSigns.marks?.[0]).to.deep.include({
        id: 'admission',
        label: '入院'
      })
      expect(vitalSigns.pagination).to.deep.include({
        mode: 'time-window',
        windowSize: 7,
        repeatedHeaderHeight: 34,
        eventTrackHeight: 20
      })

      const partogramId = editor.command.executeInsertChartGraphic({
        kind: 'partogram',
        presetId: 'medical.partogram.standard'
      })
      const partogram = editor.command.getChartGraphic(partogramId!)!
      expect(partogram.interaction?.coordinateLocked).to.eq(true)
      expect(partogram.series?.map(series => series.id)).to.include.members([
        'cervix',
        'alert-line',
        'action-line',
        'station'
      ])
      expect(
        editor.command.executeUpdateChartGraphic(partogramId!, {
          coordinate: {
            xAxis: { type: 'linear', min: 0, max: 24 }
          }
        })
      ).to.eq(false)
      expect(
        editor.command.getChartGraphic(partogramId!)?.coordinate?.xAxis?.max
      ).to.eq(12)

      const anesthesiaId = editor.command.executeInsertChartGraphic({
        kind: 'anesthesia',
        presetId: 'medical.anesthesia.standard'
      })
      const anesthesia = editor.command.getChartGraphic(anesthesiaId!)!
      expect(anesthesia.pagination).to.deep.include({
        mode: 'time-window',
        windowSize: 60,
        repeatedHeaderHeight: 30,
        eventTrackHeight: 22
      })
      expect(anesthesia.marks?.map(mark => mark.id)).to.deep.eq([
        'induction',
        'incision'
      ])
    })
  })

  it('refreshes chart graphics from registered data providers', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'ward-vitals',
          fieldMap: {
            x: 'recordedAt',
            y: 'temperature'
          },
          refreshMode: 'manual',
          version: 'before'
        }
      })
      expect(id).to.be.a('string')

      let loadCount = 0
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'ward-vitals',
        async load(payload) {
          loadCount++
          expect(payload.chartId).to.eq(id)
          expect(payload.kind).to.eq('line')
          expect(payload.source.version).to.eq('before')
          expect(payload.fieldMap).to.deep.eq({
            x: 'recordedAt',
            y: 'temperature'
          })
          return {
            title: '刷新后的趋势图',
            series: [
              {
                id: 'temperature',
                name: '体温',
                type: 'line',
                symbol: 'circle',
                color: '#dc2626',
                data: [
                  { x: '2026-06-08T08:00:00', y: 36.8 },
                  { x: '2026-06-08T12:00:00', y: 37.2 }
                ]
              }
            ],
            marks: [
              {
                id: 'fever-note',
                type: 'warning',
                x: '2026-06-08T12:00:00',
                y: 37.2,
                label: '复测'
              }
            ],
            source: {
              sourceId: 'ward-vitals',
              fieldMap: payload.source.fieldMap,
              refreshMode: 'manual',
              version: 'after'
            }
          }
        }
      })

      return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!)).then(
        refreshed => {
          expect(refreshed).to.eq(true)
          expect(loadCount).to.eq(1)
          const chart = editor.command.getChartGraphic(id!)
          expect(chart?.title).to.eq('刷新后的趋势图')
          expect(chart?.series?.[0].id).to.eq('temperature')
          expect(chart?.series?.[0].data).to.have.length(2)
          expect(chart?.marks?.[0].id).to.eq('fever-note')
          expect(chart?.source?.version).to.eq('after')

          unregister()
          return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!))
        }
      ).then(refreshedAfterUnregister => {
        expect(refreshedAfterUnregister).to.eq(false)
        expect(loadCount).to.eq(1)
      })
    })
  })

  it('normalizes provider records through field maps and template default sources', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const unregisterPreset = editor.command.registerChartGraphicPreset({
        id: 'custom.line.bound-template',
        kind: 'line',
        name: '绑定模板折线图',
        version: '1.0.0',
        defaultSize: {
          width: 420,
          height: 220
        },
        defaultCoordinate: {
          xAxis: {
            type: 'time',
            min: '2026-07-13T00:00:00',
            max: '2026-07-14T00:00:00'
          },
          yAxis: {
            type: 'linear',
            min: 35,
            max: 42
          }
        },
        defaultSeries: [
          {
            id: 'temperature',
            name: '体温',
            type: 'line',
            symbol: 'circle',
            color: '#dc2626',
            data: []
          }
        ],
        defaultSource: {
          sourceId: 'template-vitals',
          refreshMode: 'manual',
          version: 'template-v1',
          fieldMap: {
            x: 'measuredAt',
            y: 'temperature',
            seriesId: 'series',
            markX: 'noteAt',
            markLabel: 'note',
            markType: 'noteType'
          }
        }
      })
      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'custom.line.bound-template',
        source: {
          version: 'before',
          fieldMap: {
            y: 'value'
          }
        }
      })
      expect(id).to.be.a('string')

      const insertedChart = editor.command.getChartGraphic(id!)
      expect(insertedChart?.source).to.deep.include({
        sourceId: 'template-vitals',
        refreshMode: 'manual',
        version: 'before'
      })
      expect(insertedChart?.source?.fieldMap).to.deep.include({
        x: 'measuredAt',
        y: 'value',
        seriesId: 'series',
        markX: 'noteAt',
        markLabel: 'note',
        markType: 'noteType'
      })

      const unregisterProvider = editor.command.registerChartGraphicDataProvider({
        sourceId: 'template-vitals',
        async load(payload) {
          expect(payload.fieldMap).to.deep.include({
            x: 'measuredAt',
            y: 'value'
          })
          return {
            records: [
              {
                measuredAt: '2026-07-13T08:00:00',
                value: '36.8',
                series: 'temperature',
                noteAt: '2026-07-13T08:00:00',
                note: '复测',
                noteType: 'warning'
              }
            ],
            source: {
              version: 'after'
            }
          }
        }
      })

      return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!)).then(
        refreshed => {
          expect(refreshed).to.eq(true)
          const chart = editor.command.getChartGraphic(id!)
          expect(chart?.series?.[0]).to.deep.include({
            id: 'temperature',
            name: '体温',
            type: 'line',
            symbol: 'circle',
            color: '#dc2626'
          })
          expect(chart?.series?.[0].data).to.deep.eq([
            { x: '2026-07-13T08:00:00', y: 36.8, label: undefined }
          ])
          expect(chart?.marks).to.deep.eq([
            {
              id: 'mark-0',
              type: 'warning',
              x: '2026-07-13T08:00:00',
              y: undefined,
              label: '复测'
            }
          ])
          expect(chart?.source).to.deep.include({
            sourceId: 'template-vitals',
            refreshMode: 'manual',
            version: 'after',
            lastError: undefined
          })
          expect(chart?.source?.fieldMap).to.deep.include({
            x: 'measuredAt',
            y: 'value'
          })
          unregisterProvider()
          unregisterPreset()
        }
      )
    })
  })

  it('maps provider records into multiple series regions and annotations', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'mapped-clinical-events',
          refreshMode: 'manual',
          fieldMap: {
            x: 'measuredAt',
            y: 'temperature,pulse',
            label: 'label',
            regionId: 'phaseId',
            regionType: 'phaseType',
            regionXStart: 'phaseStart',
            regionXEnd: 'phaseEnd',
            regionYStart: 'phaseYStart',
            regionYEnd: 'phaseYEnd',
            regionLabel: 'phaseLabel',
            regionColor: 'phaseColor',
            annotationId: 'noteId',
            annotationX: 'noteAt',
            annotationY: 'noteY',
            annotationText: 'note'
          }
        },
        series: [
          {
            id: 'temperature',
            name: '体温',
            type: 'line',
            symbol: 'circle',
            color: '#dc2626',
            data: []
          },
          {
            id: 'pulse',
            name: '脉搏',
            type: 'stepLine',
            symbol: 'square',
            color: '#2563eb',
            data: []
          }
        ]
      })
      expect(id).to.be.a('string')

      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'mapped-clinical-events',
        async load() {
          return {
            records: [
              {
                measuredAt: '2026-07-16T08:00:00',
                temperature: '36.8',
                pulse: 78,
                label: '晨测',
                phaseId: 'phase-1',
                phaseType: 'warning',
                phaseStart: '2026-07-16T08:00:00',
                phaseEnd: '2026-07-16T12:00:00',
                phaseYStart: 35,
                phaseYEnd: 38,
                phaseLabel: '观察期',
                phaseColor: '#fde68a',
                noteId: 'note-1',
                noteAt: '2026-07-16T08:00:00',
                noteY: 36.8,
                note: '复测'
              },
              {
                measuredAt: '2026-07-16T12:00:00',
                temperature: 37.1,
                pulse: '82',
                label: '午测'
              }
            ],
            source: {
              version: 'mapped-v2'
            }
          }
        }
      })

      return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!)).then(
        refreshed => {
          expect(refreshed).to.eq(true)
          const chart = editor.command.getChartGraphic(id!)
          expect(chart?.series?.map(series => series.id)).to.deep.eq([
            'temperature',
            'pulse'
          ])
          expect(chart?.series?.[0]).to.deep.include({
            id: 'temperature',
            name: '体温',
            type: 'line',
            symbol: 'circle',
            color: '#dc2626'
          })
          expect(chart?.series?.[1]).to.deep.include({
            id: 'pulse',
            name: '脉搏',
            type: 'stepLine',
            symbol: 'square',
            color: '#2563eb'
          })
          expect(chart?.series?.[0].data).to.deep.eq([
            { x: '2026-07-16T08:00:00', y: 36.8, label: '晨测' },
            { x: '2026-07-16T12:00:00', y: 37.1, label: '午测' }
          ])
          expect(chart?.series?.[1].data).to.deep.eq([
            { x: '2026-07-16T08:00:00', y: 78, label: '晨测' },
            { x: '2026-07-16T12:00:00', y: 82, label: '午测' }
          ])
          expect(chart?.regions).to.deep.eq([
            {
              id: 'phase-1',
              type: 'warning',
              xStart: '2026-07-16T08:00:00',
              xEnd: '2026-07-16T12:00:00',
              yStart: 35,
              yEnd: 38,
              label: '观察期',
              color: '#fde68a'
            }
          ])
          expect(chart?.annotations).to.deep.eq([
            {
              id: 'note-1',
              x: '2026-07-16T08:00:00',
              y: 36.8,
              text: '复测'
            }
          ])
          expect(chart?.source?.version).to.eq('mapped-v2')
          unregister()
        }
      )
    })
  })

  it('applies source field transforms when mapping provider records', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'transformed-records',
          refreshMode: 'manual',
          fieldMap: {
            x: 'measuredAt',
            y: 'tempF,glucoseMgdl',
            label: 'label',
            markX: 'measuredAt',
            markY: 'tempF',
            markLabel: 'label',
            annotationX: 'measuredAt',
            annotationY: 'glucoseMgdl',
            annotationText: 'note'
          },
          fieldTransforms: {
            tempF: {
              unit: 'fahrenheit-to-celsius',
              precision: 1
            },
            glucoseMgdl: {
              unit: 'mgdl-to-mmol-l',
              precision: 1
            },
            label: {
              trim: true
            }
          }
        },
        series: [
          {
            id: 'tempF',
            name: '体温',
            type: 'line',
            data: []
          },
          {
            id: 'glucoseMgdl',
            name: '血糖',
            type: 'line',
            data: []
          }
        ]
      })
      expect(id).to.be.a('string')

      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'transformed-records',
        async load(payload) {
          expect(payload.fieldTransforms?.tempF).to.deep.include({
            unit: 'fahrenheit-to-celsius',
            precision: 1
          })
          return {
            records: [
              {
                measuredAt: '2026-07-27T08:00:00',
                tempF: '98.6',
                glucoseMgdl: '180',
                label: ' 晨测 ',
                note: '餐后复查'
              },
              {
                measuredAt: '2026-07-27T12:00:00',
                tempF: 100.4,
                glucoseMgdl: 126,
                label: '午测'
              }
            ],
            source: {
              version: 'transform-v1'
            }
          }
        }
      })

      return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!)).then(
        refreshed => {
          expect(refreshed).to.eq(true)
          const chart = editor.command.getChartGraphic(id!)
          expect(chart?.series?.[0].data).to.deep.eq([
            { x: '2026-07-27T08:00:00', y: 37, label: '晨测' },
            { x: '2026-07-27T12:00:00', y: 38, label: '午测' }
          ])
          expect(chart?.series?.[1].data).to.deep.eq([
            { x: '2026-07-27T08:00:00', y: 10, label: '晨测' },
            { x: '2026-07-27T12:00:00', y: 7, label: '午测' }
          ])
          expect(chart?.marks?.[0]).to.deep.include({
            y: 37,
            label: '晨测'
          })
          expect(chart?.annotations?.[0]).to.deep.include({
            y: 10,
            text: '餐后复查'
          })
          expect(chart?.source?.fieldTransforms?.tempF).to.deep.include({
            unit: 'fahrenheit-to-celsius',
            precision: 1
          })
          expect(chart?.source?.version).to.eq('transform-v1')
          unregister()
        }
      )
    })
  })

  it('supports append and merge strategies for provider refresh patches', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'incremental-vitals',
          refreshMode: 'manual',
          mergeStrategy: 'append',
          version: 'before'
        },
        series: [
          {
            id: 'temperature',
            name: '体温',
            type: 'line',
            symbol: 'circle',
            data: [{ x: '2026-07-27T08:00:00', y: 36.8 }]
          }
        ],
        marks: [
          {
            id: 'mark-0',
            type: 'event',
            x: '2026-07-27T08:00:00',
            label: '晨测'
          }
        ],
        regions: [
          {
            id: 'phase-1',
            type: 'range',
            xStart: '2026-07-27T08:00:00',
            xEnd: '2026-07-27T12:00:00',
            label: '观察期'
          }
        ],
        annotations: [
          {
            id: 'note-1',
            x: '2026-07-27T08:00:00',
            y: 36.8,
            text: '基础记录'
          }
        ]
      })
      expect(id).to.be.a('string')

      const unregisterAppend = editor.command.registerChartGraphicDataProvider({
        sourceId: 'incremental-vitals',
        async load(payload) {
          expect(payload.mergeStrategy).to.eq('append')
          return {
            series: [
              {
                id: 'temperature',
                name: '体温',
                type: 'line',
                symbol: 'circle',
                data: [{ x: '2026-07-27T12:00:00', y: 37.2 }]
              },
              {
                id: 'pulse',
                name: '脉搏',
                type: 'stepLine',
                symbol: 'square',
                data: [{ x: '2026-07-27T12:00:00', y: 82 }]
              }
            ],
            marks: [
              {
                id: 'mark-1',
                type: 'warning',
                x: '2026-07-27T12:00:00',
                label: '午测'
              }
            ],
            source: {
              version: 'append-v1'
            }
          }
        }
      })

      return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!)).then(
        refreshed => {
          expect(refreshed).to.eq(true)
          const chart = editor.command.getChartGraphic(id!)!
          expect(chart.series?.[0].data).to.deep.eq([
            { x: '2026-07-27T08:00:00', y: 36.8 },
            { x: '2026-07-27T12:00:00', y: 37.2 }
          ])
          expect(chart.series?.[1].id).to.eq('pulse')
          expect(chart.marks?.map(mark => mark.id)).to.deep.eq([
            'mark-0',
            'mark-1'
          ])
          expect(chart.source?.version).to.eq('append-v1')
          unregisterAppend()

          expect(
            editor.command.executeUpdateChartGraphic(id!, {
              source: {
                ...chart.source,
                mergeStrategy: 'merge',
                version: 'append-v1'
              }
            })
          ).to.eq(true)

          const unregisterMerge = editor.command.registerChartGraphicDataProvider({
            sourceId: 'incremental-vitals',
            async load(payload) {
              expect(payload.mergeStrategy).to.eq('merge')
              return {
                strategy: 'merge',
                series: [
                  {
                    id: 'temperature',
                    name: '体温',
                    type: 'line',
                    symbol: 'circle',
                    data: [
                      {
                        x: '2026-07-27T12:00:00',
                        y: 37.4,
                        label: '复测'
                      },
                      { x: '2026-07-27T16:00:00', y: 37.1 }
                    ]
                  }
                ],
                marks: [
                  {
                    id: 'mark-1',
                    type: 'warning',
                    x: '2026-07-27T12:00:00',
                    label: '午后复测'
                  },
                  {
                    id: 'mark-2',
                    type: 'event',
                    x: '2026-07-27T16:00:00',
                    label: '晚测'
                  }
                ],
                regions: [
                  {
                    id: 'phase-1',
                    type: 'range',
                    xStart: '2026-07-27T08:00:00',
                    xEnd: '2026-07-27T16:00:00',
                    label: '观察延长'
                  }
                ],
                annotations: [
                  {
                    id: 'note-1',
                    x: '2026-07-27T12:00:00',
                    y: 37.4,
                    text: '已复测'
                  },
                  {
                    id: 'note-2',
                    x: '2026-07-27T16:00:00',
                    y: 37.1,
                    text: '趋势回落'
                  }
                ],
                source: {
                  version: 'merge-v2'
                }
              }
            }
          })

          return cy
            .wrap(editor.command.executeRefreshChartGraphicSource(id!))
            .then(merged => {
              expect(merged).to.eq(true)
              const nextChart = editor.command.getChartGraphic(id!)!
              expect(nextChart.series?.[0].data).to.deep.eq([
                { x: '2026-07-27T08:00:00', y: 36.8 },
                {
                  x: '2026-07-27T12:00:00',
                  y: 37.4,
                  label: '复测'
                },
                { x: '2026-07-27T16:00:00', y: 37.1 }
              ])
              expect(nextChart.marks?.map(mark => mark.label)).to.deep.eq([
                '晨测',
                '午后复测',
                '晚测'
              ])
              expect(nextChart.regions?.[0].label).to.eq('观察延长')
              expect(nextChart.annotations?.map(item => item.id)).to.deep.eq([
                'note-1',
                'note-2'
              ])
              expect(nextChart.annotations?.[0].text).to.eq('已复测')
              expect(nextChart.source?.mergeStrategy).to.eq('merge')
              expect(nextChart.source?.version).to.eq('merge-v2')
              unregisterMerge()
            })
        }
      )
    })
  })

  it('lets provider refresh update locked template coordinates', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const unregisterPreset = editor.command.registerChartGraphicPreset({
        id: 'custom.line.locked-source',
        kind: 'line',
        name: '锁定坐标绑定图',
        version: '1.0.0',
        defaultSize: {
          width: 360,
          height: 180
        },
        defaultCoordinate: {
          xAxis: {
            type: 'linear',
            min: 0,
            max: 10
          },
          yAxis: {
            type: 'linear',
            min: 0,
            max: 10
          }
        },
        defaultInteraction: {
          coordinateLocked: true
        },
        defaultSeries: [
          {
            id: 'locked',
            type: 'line',
            data: [{ x: 0, y: 1 }]
          }
        ],
        defaultSource: {
          sourceId: 'locked-source',
          refreshMode: 'manual'
        }
      })
      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'custom.line.locked-source'
      })
      expect(id).to.be.a('string')
      expect(
        editor.command.executeUpdateChartGraphic(id!, {
          coordinate: {
            xAxis: {
              type: 'linear',
              min: 0,
              max: 20
            }
          }
        })
      ).to.eq(false)
      expect(editor.command.getChartGraphic(id!)?.coordinate?.xAxis?.max).to.eq(
        10
      )

      const unregisterProvider = editor.command.registerChartGraphicDataProvider({
        sourceId: 'locked-source',
        async load() {
          return {
            coordinate: {
              xAxis: {
                type: 'linear',
                min: 0,
                max: 20
              },
              yAxis: {
                type: 'linear',
                min: 0,
                max: 20
              }
            },
            series: [
              {
                id: 'locked',
                type: 'line',
                data: [{ x: 18, y: 12 }]
              }
            ]
          }
        }
      })

      return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!)).then(
        refreshed => {
          expect(refreshed).to.eq(true)
          const chart = editor.command.getChartGraphic(id!)
          expect(chart?.coordinate?.xAxis?.max).to.eq(20)
          expect(chart?.coordinate?.yAxis?.max).to.eq(20)
          expect(chart?.series?.[0].data).to.deep.eq([{ x: 18, y: 12 }])
          unregisterProvider()
          unregisterPreset()
        }
      )
    })
  })

  it('records provider refresh failures for validation and bulk results', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'failing-vitals',
          refreshMode: 'manual',
          fieldMap: {
            x: 'recordedAt'
          }
        }
      })
      expect(id).to.be.a('string')
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'failing-vitals',
        async load() {
          throw new Error('network down')
        }
      })

      return cy
        .wrap(editor.command.executeRefreshChartGraphicSource(id!))
        .then(refreshed => {
          expect(refreshed).to.eq(false)
          expect(editor.command.getChartGraphic(id!)?.source?.lastError).to.eq(
            'network down'
          )
          const validation = editor.command.getChartGraphicValidation(id!)
          const warningCodeList = (validation?.warnings || []).map(
            issue => issue.code
          )
          expect(warningCodeList).to.include.members([
            'chart.source.lastError',
            'chart.source.fieldMapIncomplete'
          ])
          return cy.wrap(
            editor.command.executeRefreshChartGraphicSources({
              sourceId: 'failing-vitals'
            })
          )
        })
        .then(result => {
          expect(result).to.include({
            refreshed: 0,
            skipped: 0,
            failed: 1
          })
          expect(result.failedChartIds).to.deep.eq([id])
          unregister()
      })
    })
  })

  it('emits chart data source refresh lifecycle events', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'refresh-events',
          refreshMode: 'manual',
          version: 'before'
        }
      })
      expect(id).to.be.a('string')

      const events: any[] = []
      const handleRefreshEvent = (payload: any) => {
        events.push(payload)
      }
      editor.eventBus.on(
        'chartGraphicDataSourceRefresh',
        handleRefreshEvent
      )

      const unregisterSuccess = editor.command.registerChartGraphicDataProvider({
        sourceId: 'refresh-events',
        async load() {
          return {
            source: {
              version: 'success-v1'
            }
          }
        }
      })

      return cy
        .wrap(editor.command.executeRefreshChartGraphicSource(id!))
        .then(refreshed => {
          expect(refreshed).to.eq(true)
          expect(events.map(event => event.phase)).to.deep.eq([
            'before',
            'success',
            'complete'
          ])
          expect(events[0]).to.deep.include({
            chartId: id,
            sourceId: 'refresh-events',
            refreshMode: 'manual',
            version: 'before'
          })
          expect(events[1]).to.deep.include({
            phase: 'success',
            status: 'refreshed',
            version: 'success-v1'
          })
          expect(events[1].refreshDurationMs).to.be.a('number')
          expect(events[2]).to.deep.include({
            phase: 'complete',
            status: 'refreshed',
            version: 'success-v1'
          })
          unregisterSuccess()
          events.length = 0

          const unregisterFailure =
            editor.command.registerChartGraphicDataProvider({
              sourceId: 'refresh-events',
              async load() {
                throw new Error('refresh event failure')
              }
            })

          return cy
            .wrap(editor.command.executeRefreshChartGraphicSource(id!))
            .then(failed => {
              expect(failed).to.eq(false)
              expect(events.map(event => event.phase)).to.deep.eq([
                'before',
                'error',
                'complete'
              ])
              expect(events[1]).to.deep.include({
                phase: 'error',
                status: 'failed',
                reason: 'provider-error',
                error: 'refresh event failure'
              })
              unregisterFailure()
              events.length = 0

              return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!))
            })
        })
        .then(skipped => {
          expect(skipped).to.eq(false)
          expect(events.map(event => event.phase)).to.deep.eq([
            'skipped',
            'complete'
          ])
          expect(events[0]).to.deep.include({
            phase: 'skipped',
            status: 'skipped',
            reason: 'provider-missing',
            chartId: id,
            sourceId: 'refresh-events'
          })
          expect(events[1]).to.deep.include({
            phase: 'complete',
            status: 'skipped',
            reason: 'provider-missing'
          })
          editor.eventBus.off(
            'chartGraphicDataSourceRefresh',
            handleRefreshEvent
          )
        })
    })
  })

  it('caches versioned provider refresh results and invalidates on provider changes', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'cached-vitals',
          refreshMode: 'manual',
          version: 'cache-v1',
          fieldMap: {
            x: 'recordedAt',
            y: 'temperature'
          },
          fieldTransforms: {
            temperature: {
              precision: 1
            }
          },
          mergeStrategy: 'replace'
        }
      })
      expect(id).to.be.a('string')

      const events: any[] = []
      const handleRefreshEvent = (payload: any) => {
        events.push(payload)
      }
      editor.eventBus.on(
        'chartGraphicDataSourceRefresh',
        handleRefreshEvent
      )

      let loadCount = 0
      const unregisterFirstProvider =
        editor.command.registerChartGraphicDataProvider({
          sourceId: 'cached-vitals',
          async load(payload) {
            loadCount++
            return {
              title: `cached result ${loadCount}`,
              records: [
                {
                  recordedAt: '2026-07-28T08:00:00',
                  temperature: 36.8 + loadCount / 10
                }
              ],
              source: {
                version: payload.source.version
              }
            }
          }
        })

      return cy
        .wrap(editor.command.executeRefreshChartGraphicSource(id!))
        .then(refreshed => {
          expect(refreshed).to.eq(true)
          expect(loadCount).to.eq(1)
          expect(editor.command.getChartGraphic(id!)?.title).to.eq(
            'cached result 1'
          )
          expect(events.some(event => event.cached)).to.eq(false)
          events.length = 0

          return cy.wrap(editor.command.executeRefreshChartGraphicSource(id!))
        })
        .then(cachedRefresh => {
          expect(cachedRefresh).to.eq(true)
          expect(loadCount).to.eq(1)
          expect(editor.command.getChartGraphic(id!)?.title).to.eq(
            'cached result 1'
          )
          expect(events.map(event => event.phase)).to.deep.eq([
            'before',
            'success',
            'complete'
          ])
          expect(events[1]).to.deep.include({
            phase: 'success',
            status: 'refreshed',
            reason: 'cache-hit',
            cached: true
          })
          events.length = 0
          unregisterFirstProvider()

          const unregisterSecondProvider =
            editor.command.registerChartGraphicDataProvider({
              sourceId: 'cached-vitals',
              async load(payload) {
                loadCount++
                return {
                  title: `cached result ${loadCount}`,
                  series: [
                    {
                      id: 'temperature',
                      type: 'line',
                      data: [{ x: '2026-07-28T12:00:00', y: 37.2 }]
                    }
                  ],
                  source: {
                    version: payload.source.version
                  }
                }
              }
            })

          return cy
            .wrap(editor.command.executeRefreshChartGraphicSource(id!))
            .then(refreshedAfterProviderChange => {
              expect(refreshedAfterProviderChange).to.eq(true)
              expect(loadCount).to.eq(2)
              expect(editor.command.getChartGraphic(id!)?.title).to.eq(
                'cached result 2'
              )
              expect(events.some(event => event.cached)).to.eq(false)
              unregisterSecondProvider()
              editor.eventBus.off(
                'chartGraphicDataSourceRefresh',
                handleRefreshEvent
              )
            })
        })
    })
  })

  it('records refresh lifecycle metadata and exposes it through source audits', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'observable-source',
          refreshMode: 'manual',
          version: 'before'
        }
      })
      expect(id).to.be.a('string')
      const beforeSummary = editor.command.getChartGraphicDataSourceSummary()
      expect(beforeSummary).to.include({
        attempted: 0,
        succeeded: 0,
        neverRefreshed: 1
      })
      expect(beforeSummary.neverRefreshedChartIds).to.deep.eq([id])

      const unregisterSuccess = editor.command.registerChartGraphicDataProvider({
        sourceId: 'observable-source',
        async load() {
          return {
            source: {
              version: 'success-v1'
            }
          }
        }
      })

      return cy
        .wrap(editor.command.executeRefreshChartGraphicSource(id!))
        .then(refreshed => {
          expect(refreshed).to.eq(true)
          const source = editor.command.getChartGraphic(id!)?.source
          expect(source?.version).to.eq('success-v1')
          expect(Date.parse(source?.lastRefreshAt || '')).not.to.be.NaN
          expect(Date.parse(source?.lastSuccessAt || '')).not.to.be.NaN
          expect(source?.refreshDurationMs).to.be.a('number')
          expect(source?.refreshDurationMs).to.be.at.least(0)
          expect(source?.lastError).to.eq(undefined)

          const state =
            editor.command
              .getChartGraphicDataSourceStateList()
              .find(item => item.chartId === id)
          expect(state).to.deep.include({
            version: 'success-v1',
            lastRefreshAt: source?.lastRefreshAt,
            lastSuccessAt: source?.lastSuccessAt,
            refreshDurationMs: source?.refreshDurationMs,
            providerRegistered: true,
            refreshable: true
          })
          const summary = editor.command.getChartGraphicDataSourceSummary()
          expect(summary).to.include({
            attempted: 1,
            succeeded: 1,
            neverRefreshed: 0,
            failed: 0
          })
          expect(summary.attemptedChartIds).to.deep.eq([id])
          expect(summary.succeededChartIds).to.deep.eq([id])
          expect(summary.neverRefreshedChartIds).to.deep.eq([])

          const lastSuccessAt = source?.lastSuccessAt
          unregisterSuccess()
          const unregisterFailure =
            editor.command.registerChartGraphicDataProvider({
              sourceId: 'observable-source',
              async load() {
                throw new Error('observable failure')
              }
            })
          return cy
            .wrap(editor.command.executeRefreshChartGraphicSource(id!))
            .then(failedRefresh => {
              expect(failedRefresh).to.eq(false)
              const failedSource = editor.command.getChartGraphic(id!)?.source
              expect(failedSource?.lastError).to.eq('observable failure')
              expect(failedSource?.lastSuccessAt).to.eq(lastSuccessAt)
              expect(Date.parse(failedSource?.lastRefreshAt || '')).not.to.be.NaN
              expect(failedSource?.refreshDurationMs).to.be.a('number')
              expect(failedSource?.refreshDurationMs).to.be.at.least(0)

              const failedSummary =
                editor.command.getChartGraphicDataSourceSummary()
              expect(failedSummary).to.include({
                attempted: 1,
                succeeded: 1,
                neverRefreshed: 0,
                failed: 1
              })
              expect(failedSummary.failedChartIds).to.deep.eq([id])
              unregisterFailure()
            })
        })
    })
  })

  it('keeps only the latest concurrent refresh result for a chart', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'race-source',
          refreshMode: 'manual',
          version: 'before-race'
        }
      })
      expect(id).to.be.a('string')

      const resolveList: Array<(value: any) => void> = []
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'race-source',
        load() {
          return new Cypress.Promise(resolve => {
            resolveList.push(resolve)
          })
        }
      })

      const firstRefresh = editor.command.executeRefreshChartGraphicSource(id!)
      const secondRefresh = editor.command.executeRefreshChartGraphicSource(id!)
      expect(resolveList).to.have.length(2)

      resolveList[1]({
        title: '最新刷新结果',
        series: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 2, y: 2 }]
          }
        ],
        source: {
          version: 'latest'
        }
      })

      return cy
        .wrap(secondRefresh)
        .then(secondResult => {
          expect(secondResult).to.eq(true)
          expect(editor.command.getChartGraphic(id!)?.source?.version).to.eq(
            'latest'
          )

          resolveList[0]({
            title: '旧刷新结果',
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ],
            source: {
              version: 'stale'
            }
          })
          return cy.wrap(firstRefresh)
        })
        .then(firstResult => {
          expect(firstResult).to.eq(false)
          const chart = editor.command.getChartGraphic(id!)
          expect(chart?.title).to.eq('最新刷新结果')
          expect(chart?.source?.version).to.eq('latest')
          expect(chart?.series?.[0].data).to.deep.eq([{ x: 2, y: 2 }])
          expect(chart?.source?.lastError).to.eq(undefined)
          unregister()
        })
    })
  })

  it('audits document chart data source bindings and provider availability', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const manualId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Registered manual source',
        source: {
          sourceId: 'registered-audit-source',
          refreshMode: 'manual',
          version: 'manual-v1'
        }
      })
      const onOpenId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Missing on-open source',
        source: {
          sourceId: 'missing-open-source',
          refreshMode: 'on-open',
          version: 'open-v1'
        }
      })
      const onPrintId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Failed on-print source',
        source: {
          sourceId: 'missing-print-source',
          refreshMode: 'on-print',
          version: 'print-v1',
          lastError: 'provider timeout'
        }
      })
      const unboundId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Unbound chart'
      })
      expect(manualId).to.be.a('string')
      expect(onOpenId).to.be.a('string')
      expect(onPrintId).to.be.a('string')
      expect(unboundId).to.be.a('string')

      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'registered-audit-source',
        async load() {
          return {}
        }
      })

      const stateList =
        editor.command.getChartGraphicDataSourceStateList()
      expect(stateList).to.have.length(4)
      expect(stateList.find(state => state.chartId === manualId)).to.deep.include(
        {
          kind: 'line',
          title: 'Registered manual source',
          bound: true,
          sourceId: 'registered-audit-source',
          refreshMode: 'manual',
          version: 'manual-v1',
          providerRegistered: true,
          refreshable: true
        }
      )
      expect(stateList.find(state => state.chartId === onOpenId)).to.deep.include(
        {
          bound: true,
          sourceId: 'missing-open-source',
          refreshMode: 'on-open',
          providerRegistered: false,
          refreshable: false
        }
      )
      expect(stateList.find(state => state.chartId === onPrintId)).to.deep.include(
        {
          bound: true,
          sourceId: 'missing-print-source',
          refreshMode: 'on-print',
          lastError: 'provider timeout',
          providerRegistered: false,
          refreshable: false
        }
      )
      expect(stateList.find(state => state.chartId === unboundId)).to.deep.include(
        {
          bound: false,
          providerRegistered: false,
          refreshable: false
        }
      )

      const summary = editor.command.getChartGraphicDataSourceSummary()
      expect(summary).to.include({
        checked: 4,
        bound: 3,
        unbound: 1,
        providerMissing: 2,
        failed: 1,
        manual: 1,
        onOpen: 1,
        onPrint: 1
      })
      expect(summary.unboundChartIds).to.deep.eq([unboundId])
      expect(summary.providerMissingChartIds).to.deep.eq([
        onOpenId,
        onPrintId
      ])
      expect(summary.failedChartIds).to.deep.eq([onPrintId])
      expect(summary.manualChartIds).to.deep.eq([manualId])
      expect(summary.onOpenChartIds).to.deep.eq([onOpenId])
      expect(summary.onPrintChartIds).to.deep.eq([onPrintId])
      expect(summary.states).to.deep.eq(stateList)

      unregister()
      expect(
        editor.command.getChartGraphicDataSourceSummary()
          .providerMissingChartIds
      ).to.deep.eq([manualId, onOpenId, onPrintId])
    })
  })

  it('bulk refreshes chart graphics from registered data providers', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const manualId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'ward-vitals',
          refreshMode: 'manual',
          version: 'manual-before'
        }
      })
      const printId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'ward-vitals',
          refreshMode: 'on-print',
          version: 'print-before'
        }
      })
      const otherId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'other-source',
          refreshMode: 'on-print',
          version: 'other-before'
        }
      })
      expect(manualId).to.be.a('string')
      expect(printId).to.be.a('string')
      expect(otherId).to.be.a('string')

      const loadChartIdList: string[] = []
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'ward-vitals',
        async load(payload) {
          loadChartIdList.push(payload.chartId)
          return {
            title: `刷新-${payload.chartId}`,
            series: [
              {
                id: 'temperature',
                type: 'line',
                data: [{ x: loadChartIdList.length, y: 36.5 }]
              }
            ],
            source: {
              ...payload.source,
              version: `after-${payload.source.refreshMode}`
            }
          }
        }
      })

      return cy
        .wrap(
          editor.command.executeRefreshChartGraphicSources({
            refreshMode: 'on-print'
          })
        )
        .then(result => {
          expect(result).to.include({
            refreshed: 1,
            skipped: 2,
            failed: 0
          })
          expect(result.refreshedChartIds).to.deep.eq([printId])
          expect(result.skippedChartIds).to.include.members([manualId!, otherId!])
          expect(loadChartIdList).to.deep.eq([printId])
          expect(editor.command.getChartGraphic(printId!)?.source?.version).to.eq(
            'after-on-print'
          )
          expect(editor.command.getChartGraphic(manualId!)?.source?.version).to.eq(
            'manual-before'
          )

          return cy.wrap(
            editor.command.executeRefreshChartGraphicSources({
              sourceId: 'ward-vitals'
            })
          )
        })
        .then(result => {
          expect(result).to.include({
            refreshed: 2,
            skipped: 1,
            failed: 0
          })
          expect(result.refreshedChartIds).to.deep.eq([manualId, printId])
          expect(result.skippedChartIds).to.deep.eq([otherId])
          expect(loadChartIdList).to.deep.eq([printId, manualId])
          expect(editor.command.getChartGraphic(manualId!)?.source?.version).to.eq(
            'after-manual'
          )
          unregister()
      })
    })
  })

  it('automatically refreshes on-open chart graphics after setting document value', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      let loadCount = 0
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'on-open-vitals',
        async load(payload) {
          loadCount++
          expect(payload.source.refreshMode).to.eq('on-open')
          return {
            series: [
              {
                id: 'temperature',
                name: '体温',
                type: 'line',
                data: [{ x: 1, y: 37.2 }]
              }
            ],
            source: {
              version: `open-${loadCount}`
            }
          }
        }
      })

      editor.command.executeSetValue({
        main: [
          { value: '打开刷新\n' },
          createChartGraphicElement(
            {
              id: 'on-open-chart',
              kind: 'line',
              presetId: 'common.line.basic',
              source: {
                sourceId: 'on-open-vitals',
                refreshMode: 'on-open',
                version: 'before-open'
              }
            },
            'on-open-chart'
          )
        ]
      })

      return cy
        .wrap(
          new Cypress.Promise<void>((resolve, reject) => {
            const startedAt = Date.now()
            const timer = window.setInterval(() => {
              const chart = editor.command.getChartGraphic('on-open-chart')
              if (chart?.source?.version === 'open-1') {
                window.clearInterval(timer)
                resolve()
                return
              }
              if (Date.now() - startedAt > 4000) {
                window.clearInterval(timer)
                reject(new Error('on-open chart refresh timed out'))
              }
            }, 50)
          })
        )
        .then(() => {
          expect(loadCount).to.eq(1)
          const chart = editor.command.getChartGraphic('on-open-chart')
          expect(chart?.series?.[0].data).to.deep.eq([{ x: 1, y: 37.2 }])
          expect(chart?.source).to.deep.include({
            sourceId: 'on-open-vitals',
            refreshMode: 'on-open',
            version: 'open-1',
            lastError: undefined
          })
          editor.command.executeUndo()
          expect(
            editor.command.getChartGraphic('on-open-chart')?.source?.version
          ).to.eq('open-1')
          unregister()
        })
    })
  })

  it('refreshes on-open chart graphics when provider is registered after document value', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      editor.command.executeSetValue({
        main: [
          { value: '延迟 provider\n' },
          createChartGraphicElement(
            {
              id: 'late-provider-on-open-chart',
              kind: 'line',
              presetId: 'common.line.basic',
              source: {
                sourceId: 'late-on-open-vitals',
                refreshMode: 'on-open',
                version: 'before-provider'
              }
            },
            'late-provider-on-open-chart'
          )
        ]
      })

      return cy
        .wait(120)
        .then(() => {
          expect(
            editor.command.getChartGraphic('late-provider-on-open-chart')?.source
              ?.version
          ).to.eq('before-provider')

          const unregister = editor.command.registerChartGraphicDataProvider({
            sourceId: 'late-on-open-vitals',
            async load(payload) {
              expect(payload.chartId).to.eq('late-provider-on-open-chart')
              expect(payload.source.refreshMode).to.eq('on-open')
              return {
                series: [
                  {
                    id: 'temperature',
                    type: 'line',
                    data: [{ x: 2, y: 36.9 }]
                  }
                ],
                source: {
                  version: 'after-provider'
                }
              }
            }
          })
          return cy
            .wrap(
              new Cypress.Promise<void>((resolve, reject) => {
                const startedAt = Date.now()
                const timer = window.setInterval(() => {
                  const chart = editor.command.getChartGraphic(
                    'late-provider-on-open-chart'
                  )
                  if (chart?.source?.version === 'after-provider') {
                    window.clearInterval(timer)
                    resolve()
                    return
                  }
                  if (Date.now() - startedAt > 4000) {
                    window.clearInterval(timer)
                    reject(new Error('late provider on-open refresh timed out'))
                  }
                }, 50)
              })
            )
            .then(() => {
              expect(
                editor.command.getChartGraphic('late-provider-on-open-chart')
                  ?.series?.[0].data
              ).to.deep.eq([{ x: 2, y: 36.9 }])
              unregister()
            })
        })
    })
  })

  it('awaits on-open refresh with async set value and supports opting out', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      let loadCount = 0
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'async-on-open-vitals',
        async load() {
          loadCount++
          return {
            series: [
              {
                id: 'temperature',
                type: 'line',
                data: [{ x: 3, y: 37 }]
              }
            ],
            source: {
              version: `async-${loadCount}`
            }
          }
        }
      })

      return cy
        .wrap(
          editor.command.executeSetValueAsync({
            main: [
              { value: '等待打开刷新\n' },
              createChartGraphicElement(
                {
                  id: 'async-on-open-chart',
                  kind: 'line',
                  presetId: 'common.line.basic',
                  source: {
                    sourceId: 'async-on-open-vitals',
                    refreshMode: 'on-open',
                    version: 'before-async'
                  }
                },
                'async-on-open-chart'
              )
            ]
          })
        )
        .then(result => {
          expect(result).to.include({
            refreshed: 1,
            skipped: 0,
            failed: 0
          })
          expect(result.refreshedChartIds).to.deep.eq(['async-on-open-chart'])
          expect(loadCount).to.eq(1)
          expect(
            editor.command.getChartGraphic('async-on-open-chart')?.source
              ?.version
          ).to.eq('async-1')

          editor.command.executeSetValue(
            {
              main: [
                { value: '禁用打开刷新\n' },
                createChartGraphicElement(
                  {
                    id: 'disabled-on-open-chart',
                    kind: 'line',
                    presetId: 'common.line.basic',
                    source: {
                      sourceId: 'async-on-open-vitals',
                      refreshMode: 'on-open',
                      version: 'before-disabled'
                    }
                  },
                  'disabled-on-open-chart'
                )
              ]
            },
            {
              isRefreshChartGraphicOnOpen: false
            }
          )
          return cy.wait(150)
        })
        .then(() => {
          expect(loadCount).to.eq(1)
          expect(
            editor.command.getChartGraphic('disabled-on-open-chart')?.source
              ?.version
          ).to.eq('before-disabled')
          unregister()
        })
    })
  })

  it('refreshes chart data as readonly preview without submitting history', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)
      editor.command.executeSetValue(
        {
          main: [
            { value: '只读预览刷新\n' },
            createChartGraphicElement(
              {
                id: 'readonly-preview-chart',
                kind: 'line',
                presetId: 'common.line.basic',
                source: {
                  sourceId: 'readonly-preview-vitals',
                  refreshMode: 'manual',
                  version: 'before-preview'
                }
              },
              'readonly-preview-chart'
            )
          ]
        },
        {
          isRefreshChartGraphicOnOpen: false
        }
      )

      let loadCount = 0
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'readonly-preview-vitals',
        async load() {
          loadCount++
          return {
            series: [
              {
                id: 'temperature',
                type: 'line',
                data: [{ x: loadCount, y: 36.5 + loadCount / 10 }]
              }
            ],
            source: {
              version: `preview-${loadCount}`
            }
          }
        }
      })
      editor.command.executeMode(EditorMode.READONLY)

      return cy
        .wrap(
          editor.command.executeRefreshChartGraphicSource(
            'readonly-preview-chart'
          )
        )
        .then(refreshed => {
          expect(refreshed).to.eq(false)
          expect(loadCount).to.eq(0)
          return cy.wrap(
            editor.command.executeRefreshChartGraphicSources({
              sourceId: 'readonly-preview-vitals'
            })
          )
        })
        .then(result => {
          expect(result).to.deep.include({
            refreshed: 0,
            skipped: 0,
            failed: 0
          })
          return cy.wrap(
            editor.command.executeRefreshChartGraphicSource(
              'readonly-preview-chart',
              {
                preview: true
              }
            )
          )
        })
        .then(refreshed => {
          expect(refreshed).to.eq(true)
          expect(loadCount).to.eq(1)
          expect(
            editor.command.getChartGraphic('readonly-preview-chart')?.source
              ?.version
          ).to.eq('preview-1')
          return cy.wrap(
            editor.command.executeRefreshChartGraphicSources(
              {
                sourceId: 'readonly-preview-vitals'
              },
              {
                preview: true
              }
            )
          )
        })
        .then(result => {
          expect(result).to.include({
            refreshed: 1,
            skipped: 0,
            failed: 0
          })
          expect(result.refreshedChartIds).to.deep.eq([
            'readonly-preview-chart'
          ])
          expect(loadCount).to.eq(2)
          editor.command.executeMode(EditorMode.EDIT)
          editor.command.executeUndo()
          expect(
            editor.command.getChartGraphic('readonly-preview-chart')?.source
              ?.version
          ).to.eq('preview-2')
          unregister()
        })
    })
  })

  it('renders chart graphics with coordinate and dental renderers on canvas', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)
      editor.command.executeInsertChartGraphic({
        kind: 'menstrual',
        presetId: 'medical.menstrual.standard'
      })
      editor.command.executeInsertChartGraphic({
        kind: 'partogram',
        presetId: 'medical.partogram.standard'
      })
      const dentalId = editor.command.executeInsertChartGraphic({
        kind: 'dental',
        presetId: 'medical.dental.fdi'
      })
      editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '18', {
        status: ['missing', 'implant']
      })
      editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '17', {
        status: ['caries']
      })
      editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '16', {
        status: ['rootCanal', 'crown']
      })
      editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '15', {
        surfaces: {
          occlusal: ['filled'],
          mesial: ['caries']
        }
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
    })

    cy.get<HTMLCanvasElement>('@canvas').then($canvas => {
      const stats = readCanvasPixelStats($canvas[0])
      expect(stats.total).to.be.greaterThan(0)
      expect(stats.nonWhite).to.be.greaterThan(1000)
    })
  })

  it('renders and hit-tests smooth scatter symbol and legend primitives', () => {
    cy.window().then(win => {
      const bezierSpy = cy.spy(
        win.CanvasRenderingContext2D.prototype,
        'bezierCurveTo'
      )
      cy.getEditor().then((editor: Editor) => {
        resetDocument(editor)
        const chartId = editor.command.executeInsertChartGraphic({
          kind: 'line',
          title: 'Common Rendering Primitives',
          size: { width: 360, height: 220 },
          coordinate: {
            xAxis: { type: 'linear', min: 0, max: 10 },
            yAxis: { type: 'linear', min: 0, max: 10 },
            padding: { top: 36, right: 20, bottom: 30, left: 36 }
          },
          series: [
            {
              id: 'smooth',
              name: '平滑线',
              type: 'smoothLine',
              symbol: 'none',
              color: '#2563eb',
              data: [
                { x: 0, y: 2 },
                { x: 3, y: 9 },
                { x: 7, y: 1 },
                { x: 10, y: 8 }
              ]
            },
            {
              id: 'scatter',
              name: '散点',
              type: 'scatter',
              symbol: 'triangle',
              color: '#dc2626',
              data: [
                { x: 2, y: 4 },
                { x: 8, y: 6 }
              ]
            }
          ]
        })
        expect(chartId).to.be.a('string')
        getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
        expect(bezierSpy).to.have.been.called

        const chart = editor.command.getChartGraphic(chartId!)!
        const position = findChartGraphicPosition(editor, chartId!)
        const context = resolveChartRenderContext(
          chart,
          chart.size.width,
          chart.size.height
        )
        const smoothSeries = chart.series?.[0]
        expect(smoothSeries).to.exist
        if (!smoothSeries) throw new Error('Expected smooth chart series')
        const coordinateList = resolveChartSeriesDataPoints(
          smoothSeries,
          chart.coordinate?.xAxis
        ).map(point => resolveChartPointCoordinate(point, context))
        const flattenedCurve = flattenChartSmoothBezierSegmentList(
          resolveChartSmoothBezierSegmentList(coordinateList)
        )
        const curvePoint = flattenedCurve[6]
        expect(
          hitTestChartGraphic({
            chart,
            width: chart.size.width,
            height: chart.size.height,
            x: curvePoint.x,
            y: curvePoint.y,
            tolerance: 3
          })
        ).to.deep.include({
          target: 'series-line',
          seriesId: 'smooth'
        })

        const scatterPoint = resolveChartPointCoordinate(
          resolveChartSeriesDataPoints(
            chart.series![1],
            chart.coordinate?.xAxis
          )[0],
          context
        )
        expect(
          hitTestChartGraphic({
            chart,
            width: chart.size.width,
            height: chart.size.height,
            x: scatterPoint.x,
            y: scatterPoint.y
          })
        ).to.deep.include({
          target: 'series-point',
          seriesId: 'scatter'
        })

        const legendItem = resolveChartLegendLayout(
          chart,
          chart.size.width,
          chart.size.height
        )[0]
        expect(legendItem).to.exist
        expect(
          hitTestChartGraphic({
            chart,
            width: chart.size.width,
            height: chart.size.height,
            x: legendItem.x + 4,
            y: legendItem.y + 6
          })
        ).to.deep.include({ target: 'legend' })

        const svg = createPrintSvgChartGraphic(position)
        expect(svg).to.match(/<path d="M [^"]+ C /)
      })
    })
  })

  it('exports chart graphics through image output', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: Editor) => {
        resetDocument(editor)
        editor.command.executeInsertChartGraphic({
          kind: 'partogram',
          presetId: 'medical.partogram.standard'
        })
        const dentalId = editor.command.executeInsertChartGraphic({
          kind: 'dental',
          presetId: 'medical.dental.fdi'
        })
        editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '18', {
          status: ['missing', 'implant']
        })
        getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

        return cy
          .wrap(editor.command.getImage({ pixelRatio: 1 }))
          .then((dataUrlList: string[]) => {
            expect(dataUrlList.length).to.be.greaterThan(0)
            expect(dataUrlList[0]).to.match(/^data:image\/png/)
            return readDataUrlPixelStats(win, dataUrlList[0]).then(stats => {
              expect(stats.total).to.be.greaterThan(0)
              expect(stats.nonWhite).to.be.greaterThan(1000)
            })
          })
      })
    })
  })

  it('exports chart graphics as SVG print content', () => {
    const menstrualElement = {
      type: ElementType.CHART_GRAPHIC,
      value: '\n',
      width: 320,
      height: 180,
      chartGraphic: {
        version: 1,
        kind: 'menstrual',
        title: '月经图',
        size: { width: 320, height: 180 },
        coordinate: {
          xAxis: { type: 'linear', min: 1, max: 28 },
          yAxis: { type: 'linear', min: 0, max: 4 },
          padding: { top: 28, right: 16, bottom: 28, left: 36 }
        },
        series: [
          {
            id: 'flow',
            type: 'stepLine',
            symbol: 'circle',
            color: '#dc2626',
            data: [
              { x: 2, y: 2 },
              { x: 3, y: 3 },
              { x: 6, y: 0 }
            ]
          }
        ],
        marks: [{ id: 'ovulation', type: 'event', x: 14, y: 1, label: '排卵' }],
        annotations: [{ id: 'follow-up', x: 7, y: 3, text: '复诊' }],
        regions: [
          {
            id: 'period',
            type: 'range',
            xStart: 2,
            xEnd: 6,
            yStart: 0,
            yEnd: 4,
            label: '经期'
          }
        ]
      }
    }
    const dentalElement = {
      type: ElementType.CHART_GRAPHIC,
      value: '\n',
      width: 260,
      height: 180,
      chartGraphic: {
        version: 1,
        kind: 'dental',
        title: '牙位图',
        size: { width: 260, height: 180 },
        dental: {
          notation: 'FDI',
          dentition: 'permanent',
          teeth: [
            {
              code: '18',
              status: ['missing', 'implant'],
              surfaces: {
                occlusal: ['filled']
              }
            },
            { code: '17', status: ['caries'] },
            { code: '16', status: ['filled'] },
            { code: '15', status: ['rootCanal', 'crown'] },
            {
              code: '14',
              surfaces: {
                mesial: ['caries'],
                occlusal: ['filled']
              }
            }
          ]
        }
      }
    }

    const svg = createPrintSvgPageListFromDocument({
      width: 500,
      height: 420,
      pageCount: 1,
      mainPositionList: [
        createPrintPosition(menstrualElement, 40, 40),
        createPrintPosition(dentalElement, 40, 230)
      ]
    })[0]

    expect(svg).to.contain('data-chart-graphic="menstrual"')
    expect(svg).to.contain('data-chart-graphic="dental"')
    expect(svg).to.contain('经期')
    expect(svg).to.contain('排卵')
    expect(svg).to.contain('复诊')
    expect(svg).to.contain('牙位图')
    expect(svg).to.contain('种植')
    expect(svg).to.contain('根管')
    expect(svg).to.contain('冠修复')
    expect(svg).to.contain('#fee2e2')
    expect(svg).to.contain('#dbeafe')
    expect(svg).to.contain('<path')
    expect(svg).to.contain('<rect')
  })

  it('exports chart graphics as a PDF blob through print SVG', () => {
    const chartElement = {
      type: ElementType.CHART_GRAPHIC,
      value: '\n',
      width: 320,
      height: 180,
      chartGraphic: {
        version: 1,
        kind: 'line',
        title: 'PDF Chart',
        size: { width: 320, height: 180 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 28, right: 16, bottom: 28, left: 36 }
        },
        series: [
          {
            id: 'trend',
            type: 'line',
            symbol: 'circle',
            color: '#2563eb',
            data: [
              { x: 0, y: 2 },
              { x: 4, y: 5 },
              { x: 8, y: 8 }
            ]
          }
        ],
        marks: [{ id: 'event', type: 'event', x: 4, y: 5, label: 'Event' }],
        annotations: [{ id: 'note', x: 6, y: 7, text: 'Note' }],
        regions: [
          {
            id: 'phase',
            type: 'phase',
            xStart: 3,
            xEnd: 7,
            yStart: 0,
            yEnd: 10,
            label: 'Active'
          }
        ]
      }
    }
    const payload = {
      width: 420,
      height: 300,
      pageCount: 1,
      mainPositionList: [createPrintPosition(chartElement, 40, 40)]
    }
    const [svg] = createPrintSvgPageListFromDocument(payload)
    expect(svg).to.contain('data-chart-graphic="line"')
    expect(svg).to.contain('PDF Chart')

    cy.wrap(createPdfBlobFromPrintSvgDocument(payload)).then(blob => {
      expect(blob.type).to.eq('application/pdf')
      expect(blob.size).to.be.greaterThan(500)
      return readBlobPrefix(blob, 4)
    }).then(prefix => {
      expect(prefix).to.eq('%PDF')
    })
  })

  it('refreshes on-print chart graphics before getPdfBlob export', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'PDF export test\n' }]
      })
      editor.command.executeSetRange(0, 0)
      getDraw(editor)
        .getServices()
        .renderInvalidationManager.flushScheduledFrameRender()

      const id = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'pdf-vitals',
          refreshMode: 'on-print',
          version: 'before-print'
        }
      })
      expect(id).to.be.a('string')

      let loadCount = 0
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'pdf-vitals',
        async load(payload) {
          loadCount++
          expect(payload.source.refreshMode).to.eq('on-print')
          return {
            title: 'PDF pre-refresh',
            series: [
              {
                id: 'pdf-series',
                type: 'line',
                data: [
                  { x: 1, y: 2 },
                  { x: 2, y: 4 }
                ]
              }
            ],
            source: {
              ...payload.source,
              version: 'after-print'
            }
          }
        }
      })

      return cy
        .wrap(
          editor.command.getPdfBlob({
            fonts: createDemoPdfFonts(resolveTestPublicAssetUrl)
          }),
          { timeout: 20000 }
        )
        .then(blob => {
          expect(loadCount).to.eq(1)
          expect(blob.type).to.eq('application/pdf')
          expect(blob.size).to.be.greaterThan(500)
          expect(editor.command.getChartGraphic(id!)?.title).to.eq('PDF pre-refresh')
          expect(editor.command.getChartGraphic(id!)?.source?.version).to.eq(
            'after-print'
          )
          unregister()
          return readBlobPrefix(blob, 4)
        })
        .then(prefix => {
          expect(prefix).to.eq('%PDF')
        })
    })
  })

  it('refreshes on-print chart graphics before executePrint', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: Editor) => {
        editor.command.executeSetValue({
          main: [{ value: 'Print export test\n' }]
        })
        editor.command.executeSetRange(0, 0)
        getDraw(editor)
          .getServices()
          .renderInvalidationManager.flushScheduledFrameRender()

        const id = editor.command.executeInsertChartGraphic({
          kind: 'line',
          presetId: 'common.line.basic',
          source: {
            sourceId: 'print-vitals',
            refreshMode: 'on-print',
            version: 'before-print'
          }
        })
        expect(id).to.be.a('string')

        let loadCount = 0
        const unregister = editor.command.registerChartGraphicDataProvider({
          sourceId: 'print-vitals',
          async load(payload) {
            loadCount++
            expect(payload.source.refreshMode).to.eq('on-print')
            return {
              title: 'Print pre-refresh',
              series: [
                {
                  id: 'print-series',
                  type: 'line',
                  data: [
                    { x: 1, y: 2 },
                    { x: 2, y: 5 }
                  ]
                }
              ],
              source: {
                ...payload.source,
                version: 'after-print'
              }
            }
          }
        })

        const originalAppend = win.document.body.append.bind(win.document.body)
        const printStub = cy.stub().as('printIframeStub')
        cy.stub(win.document.body, 'append').callsFake((...nodes: any[]) => {
          const result = originalAppend(...nodes)
          nodes.forEach(node => {
            if (node instanceof win.HTMLIFrameElement && node.contentWindow) {
              node.contentWindow.print = printStub
            }
          })
          return result
        })

        return cy
          .wrap(editor.command.executePrint())
          .then(() => {
            expect(loadCount).to.eq(1)
            expect(editor.command.getChartGraphic(id!)?.title).to.eq(
              'Print pre-refresh'
            )
            expect(editor.command.getChartGraphic(id!)?.source?.version).to.eq(
              'after-print'
            )
            unregister()
            cy.get('@printIframeStub').should('have.been.called')
          })
      })
    })
  })

  it('builds worker snapshot commands for chart graphics', () => {
    const lineElement = {
      type: ElementType.CHART_GRAPHIC,
      value: '\n',
      width: 320,
      height: 180,
      chartGraphic: {
        version: 1,
        kind: 'partogram',
        title: 'Partogram',
        size: { width: 320, height: 180 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 12 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 28, right: 16, bottom: 28, left: 36 }
        },
        series: [
          {
            id: 'cervix',
            type: 'line',
            symbol: 'circle',
            color: '#2563eb',
            data: [
              { x: 0, y: 2 },
              { x: 4, y: 4 },
              { x: 8, y: 8 }
            ]
          }
        ],
        marks: [{ id: 'event', type: 'event', x: 4, y: 4, label: 'Event' }],
        annotations: [{ id: 'note', x: 6, y: 6, text: 'Note' }],
        regions: [
          {
            id: 'phase',
            type: 'phase',
            xStart: 4,
            xEnd: 8,
            yStart: 0,
            yEnd: 10,
            label: 'Active'
          }
        ]
      }
    } as any
    const dentalElement = {
      type: ElementType.CHART_GRAPHIC,
      value: '\n',
      width: 260,
      height: 180,
      chartGraphic: {
        version: 1,
        kind: 'dental',
        title: 'Dental',
        size: { width: 260, height: 180 },
        dental: {
          notation: 'FDI',
          dentition: 'permanent',
          teeth: [
            {
              code: '18',
              status: ['missing', 'implant'],
              surfaces: {
                occlusal: ['filled']
              }
            },
            { code: '17', status: ['rootCanal', 'crown'] }
          ]
        }
      }
    } as any
    const lineCommandList: any[] = []
    pushChartGraphicWorkerSnapshotCommands({
      commandList: lineCommandList,
      element: lineElement,
      rowPosition: createPrintPosition(lineElement, 40, 40),
      alpha: 1,
      scale: 1
    })

    expect(lineCommandList.some(command => command.type === 'fillRect')).to.eq(true)
    expect(lineCommandList.some(command => command.type === 'strokePath')).to.eq(true)
    expect(
      lineCommandList.some(
        command => command.type === 'fillText' && command.text === 'Active'
      )
    ).to.eq(true)
    expect(
      lineCommandList.some(
        command => command.type === 'fillText' && command.text === 'Event'
      )
    ).to.eq(true)
    expect(
      lineCommandList.some(
        command => command.type === 'fillText' && command.text === 'Note'
      )
    ).to.eq(true)
    expect(
      lineCommandList.every(
        command => command.translateX === 40 && command.translateY === 40
      )
    ).to.eq(true)

    const dentalCommandList: any[] = []
    pushChartGraphicWorkerSnapshotCommands({
      commandList: dentalCommandList,
      element: dentalElement,
      rowPosition: createPrintPosition(dentalElement, 40, 240),
      alpha: 1,
      scale: 1
    })

    expect(
      dentalCommandList.some(
        command => command.type === 'fillText' && command.text === 'Dental'
      )
    ).to.eq(true)
    expect(
      dentalCommandList.some(
        command => command.type === 'fillText' && command.text === '18'
      )
    ).to.eq(true)
    expect(
      dentalCommandList.some(
        command =>
          command.type === 'fillSvgPath' &&
          command.fillStyle === '#dbeafe' &&
          typeof command.path === 'string' &&
          command.path.includes('M ')
      )
    ).to.eq(true)
    expect(
      dentalCommandList.some(
        command => command.type === 'fillText' && command.text === '种植'
      )
    ).to.eq(true)
    expect(
      dentalCommandList.some(
        command => command.type === 'fillText' && command.text === '根管'
      )
    ).to.eq(true)
    expect(
      dentalCommandList.some(
        command => command.type === 'fillCircle' && command.fillStyle === '#16a34a'
      )
    ).to.eq(true)
  })

  it('hit-tests coordinate and dental chart graphic internals', () => {
    const coordinateChart = {
      version: 1,
      kind: 'line',
      title: 'Hit Test',
      size: { width: 200, height: 120 },
      coordinate: {
        xAxis: { type: 'linear', min: 0, max: 10 },
        yAxis: { type: 'linear', min: 0, max: 10 },
        padding: { top: 10, right: 10, bottom: 10, left: 10 }
      },
      series: [
        {
          id: 'series-1',
          type: 'line',
          symbol: 'circle',
          data: [
            { x: 2, y: 8 },
            { x: 8, y: 2 }
          ]
        }
      ],
      marks: [{ id: 'mark-1', type: 'event', x: 2, y: 2, label: '事件' }],
      regions: [
        {
          id: 'region-1',
          type: 'range',
          xStart: 6,
          xEnd: 8,
          yStart: 1,
          yEnd: 3
        }
      ],
      annotations: [{ id: 'note-1', x: 1, y: 9, text: '说明' }]
    } as any

    expect(
      hitTestChartGraphic({
        chart: coordinateChart,
        width: 200,
        height: 120,
        x: 33,
        y: 20
      })
    ).to.deep.include({ target: 'annotation', annotationId: 'note-1' })
    expect(
      hitTestChartGraphic({
        chart: coordinateChart,
        width: 200,
        height: 120,
        x: 46,
        y: 90
      })
    ).to.deep.include({ target: 'mark', markId: 'mark-1' })
    expect(
      hitTestChartGraphic({
        chart: coordinateChart,
        width: 200,
        height: 120,
        x: 46,
        y: 30
      })
    ).to.deep.include({
      target: 'series-point',
      seriesId: 'series-1',
      dataIndex: 0
    })
    expect(
      hitTestChartGraphic({
        chart: coordinateChart,
        width: 200,
        height: 120,
        x: 100,
        y: 60
      })
    ).to.deep.include({
      target: 'series-line',
      seriesId: 'series-1'
    })
    expect(
      hitTestChartGraphic({
        chart: coordinateChart,
        width: 200,
        height: 120,
        x: 150,
        y: 98
      })
    ).to.deep.include({ target: 'region', regionId: 'region-1' })

    const dentalChart = {
      version: 1,
      kind: 'dental',
      title: 'Dental',
      size: { width: 560, height: 300 },
      dental: {
        notation: 'FDI',
        dentition: 'permanent',
        teeth: ['18', '17', '16', '15'].map(code => ({ code }))
      }
    } as any
    const dentalSurfacePoint = getDentalTestSurfacePoint()
    const dentalToothPoint = getDentalTestToothPoint()

    expect(
      hitTestChartGraphic({
        chart: dentalChart,
        width: 560,
        height: 300,
        x: dentalSurfacePoint.x,
        y: dentalSurfacePoint.y
      })
    ).to.deep.include({
      target: 'dental-surface',
      toothCode: '18',
      dentalSurface: 'buccal'
    })
    expect(
      hitTestChartGraphic({
        chart: dentalChart,
        width: 560,
        height: 300,
        x: dentalToothPoint.x,
        y: dentalToothPoint.y
      })
    ).to.deep.include({ target: 'dental-tooth', toothCode: '18' })
    expect(
      hitTestChartGraphic({
        chart: dentalChart,
        width: 560,
        height: 300,
        x: 30,
        y: 274
      })
    ).to.deep.include({ target: 'legend' })
  })

  it('downsamples high-density waveform series while preserving peaks', () => {
    const series = {
      id: 'lead-ii',
      type: 'waveform',
      symbol: 'none',
      data: Array.from({ length: 5000 }, (_, index) => {
        if (index === 1234) return 20
        if (index === 1235) return -20
        return Math.sin(index / 12)
      })
    } as any
    const points = resolveChartSeriesDataPoints(series)
    const downsampled = downsampleChartSeriesPoints({
      series,
      points,
      xMin: 0,
      xSpan: 4999,
      plotWidth: 200
    })

    expect(points).to.have.length(5000)
    expect(downsampled.length).to.be.lessThan(900)
    expect(downsampled.some(point => point.y === 20)).to.eq(true)
    expect(downsampled.some(point => point.y === -20)).to.eq(true)
    expect(downsampled[0].dataIndex).to.eq(0)
    expect(downsampled[downsampled.length - 1].dataIndex).to.eq(4999)
  })

  it('renders 12-lead ecg with standard grid layout svg worker and hit-test support', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const ecgId = editor.command.executeInsertChartGraphic({
        kind: 'ecg',
        presetId: 'medical.ecg.standard'
      })
      expect(ecgId).to.be.a('string')
      const chart = editor.command.getChartGraphic(ecgId!)!
      expect(chart.series?.map(series => series.name)).to.deep.eq([
        'I',
        'II',
        'III',
        'aVR',
        'aVL',
        'aVF',
        'V1',
        'V2',
        'V3',
        'V4',
        'V5',
        'V6'
      ])
      const context = resolveChartRenderContext(
        chart,
        chart.size.width,
        chart.size.height
      )
      const leadLayoutList = resolveEcgLeadLayoutList(chart, context)
      expect(leadLayoutList).to.have.length(12)
      expect(new Set(leadLayoutList.map(layout => layout.plot.y)).size).to.eq(3)
      expect(new Set(leadLayoutList.map(layout => layout.plot.x)).size).to.eq(4)

      const v6Series = chart.series![11]
      const { context: v6Context } = resolveEcgSeriesRenderContext(
        chart,
        context,
        v6Series,
        11
      )
      const v6Point = resolveChartSeriesDataPoints(
        v6Series,
        chart.coordinate?.xAxis
      )[18]
      const v6Coordinate = resolveChartPointCoordinate(v6Point, v6Context)
      expect(
        hitTestChartGraphic({
          chart,
          width: chart.size.width,
          height: chart.size.height,
          x: v6Coordinate.x,
          y: v6Coordinate.y,
          tolerance: 10
        })
      ).to.deep.include({
        target: 'series-point',
        seriesId: 'lead-V6',
        dataIndex: 18
      })

      const element = {
        type: ElementType.CHART_GRAPHIC,
        value: '\n',
        width: chart.size.width,
        height: chart.size.height,
        chartGraphic: chart
      } as any
      const svg = createPrintSvgChartGraphic(createPrintPosition(element, 40, 40))
      expect(svg).to.contain('25mm/s 10mm/mV')
      expect(svg).to.contain('1mV')
      expect(svg).to.contain('V6')
      expect(svg).to.contain('#fee2e2')
      expect(svg.match(/<clipPath/g) || []).to.have.length(12)
      expect(svg).to.contain('clip-path="url(#ce-chart-chart-0-ecg-lead-11)"')

      const commandList: any[] = []
      pushChartGraphicWorkerSnapshotCommands({
        commandList,
        element,
        rowPosition: createPrintPosition(element, 40, 40),
        alpha: 1,
        scale: 1
      })
      expect(
        commandList.some(command => command.type === 'fillText' && command.text === 'V6')
      ).to.eq(true)
      expect(
        commandList.some(command => command.type === 'fillText' && command.text === '1mV')
      ).to.eq(true)
      expect(commandList.some(command => command.type === 'strokeSvgPath')).to.eq(true)
      const clipCommandList = commandList.filter(
        command => command.type === 'pushClipRect'
      )
      expect(clipCommandList).to.have.length(12)
      expect(clipCommandList[0].rect.x).to.eq(40 + leadLayoutList[0].plot.x)
      expect(clipCommandList[0].rect.y).to.eq(40 + leadLayoutList[0].plot.y)
    })
  })

  it('reads chart graphic render snapshots by id', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const ecgId = editor.command.executeInsertChartGraphic({
        kind: 'ecg',
        presetId: 'medical.ecg.standard',
        width: 320,
        height: 180,
        series: [
          {
            id: 'lead-ii',
            type: 'waveform',
            symbol: 'none',
            data: Array.from({ length: 5000 }, (_, index) => {
              if (index === 1200) return 18
              if (index === 1201) return -18
              return Math.sin(index / 10)
            })
          }
        ],
        source: {
          sourceId: 'ecg-source',
          version: 'snapshot-v1'
        }
      })
      expect(ecgId).to.be.a('string')
      const ecgSnapshot = editor.command.getChartGraphicSnapshot(ecgId!)
      expect(ecgSnapshot?.kind).to.eq('ecg')
      expect(ecgSnapshot?.width).to.eq(320)
      expect(ecgSnapshot?.height).to.eq(180)
      expect(ecgSnapshot?.sourceId).to.eq('ecg-source')
      expect(ecgSnapshot?.sourceVersion).to.eq('snapshot-v1')
      expect(ecgSnapshot?.series[0]).to.include({
        id: 'lead-ii',
        type: 'waveform',
        rawPointCount: 5000
      })
      expect(ecgSnapshot?.series[0].renderPointCount).to.be.lessThan(900)

      const dentalId = editor.command.executeInsertChartGraphic({
        kind: 'dental',
        presetId: 'medical.dental.fdi'
      })
      expect(dentalId).to.be.a('string')
      const dentalSnapshot = editor.command.getChartGraphicSnapshot(dentalId!)
      expect(dentalSnapshot?.kind).to.eq('dental')
      expect(dentalSnapshot?.dentalToothCount).to.eq(32)
      expect(dentalSnapshot?.series).to.have.length(0)

      expect(editor.command.getChartGraphicSnapshot('missing-chart')).to.eq(null)
    })
  })

  it('validates chart graphic structure and data quality by id', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const validId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic'
      })
      expect(editor.command.getChartGraphicValidation(validId!)?.valid).to.eq(true)
      expect(editor.command.getChartGraphicValidation('missing-chart')).to.eq(null)

      editor.command.executeInsertElementList([
        {
          id: 'invalid-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 120,
          height: 80,
          chartGraphic: {
            version: 1,
            kind: 'line',
            title: 'Invalid line',
            size: {
              width: 120,
              height: 80
            },
            coordinate: {
              xAxis: {
                type: 'linear',
                min: 10,
                max: 1
              },
              padding: {
                left: 80,
                right: 80
              }
            },
            series: [
              {
                id: 'dup',
                type: 'line',
                data: [
                  { x: 1, y: 2 },
                  { x: 'bad-time', y: Number.NaN }
                ]
              },
              {
                id: 'dup',
                type: 'line',
                data: []
              }
            ]
          }
        } as any
      ])

      const invalidResult =
        editor.command.getChartGraphicValidation('invalid-chart')
      const invalidIssueCodeList = [
        ...(invalidResult?.errors || []),
        ...(invalidResult?.warnings || [])
      ].map(issue => issue.code)
      expect(invalidResult?.valid).to.eq(false)
      expect(invalidIssueCodeList).to.include.members([
        'chart.plotAreaInvalid',
        'chart.axis.rangeOrderInvalid',
        'chart.series.idDuplicated',
        'chart.series.pointFiltered',
        'chart.series.dataEmpty'
      ])

      editor.command.executeInsertElementList([
        {
          id: 'invalid-dental-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 560,
          height: 300,
          chartGraphic: {
            version: 1,
            kind: 'dental',
            title: 'Invalid dental',
            size: {
              width: 560,
              height: 300
            },
            dental: {
              notation: 'FDI',
              dentition: 'permanent',
              teeth: [
                { code: '18', status: ['missing'] },
                { code: '18' },
                {
                  code: '99',
                  status: ['unknown'],
                  surfaces: {
                    weird: ['caries'],
                    occlusal: 'bad',
                    mesial: ['unknown']
                  } as any
                }
              ]
            }
          }
        } as any
      ])

      const dentalResult =
        editor.command.getChartGraphicValidation('invalid-dental-chart')
      const dentalIssueCodeList = [
        ...(dentalResult?.errors || []),
        ...(dentalResult?.warnings || [])
      ].map(issue => issue.code)
      expect(dentalResult?.valid).to.eq(false)
      expect(dentalIssueCodeList).to.include.members([
        'chart.dental.toothCodeDuplicated',
        'chart.dental.toothCodeUnsupported',
        'chart.dental.statusUnsupported',
        'chart.dental.surfaceUnsupported',
        'chart.dental.surfaceStatusInvalid',
        'chart.dental.surfaceStatusUnsupported'
      ])

      const vitalSignsId = editor.command.executeInsertChartGraphic({
        kind: 'vital-signs',
        presetId: 'medical.vitalSigns.standard',
        series: [
          {
            id: 'temperature',
            name: '体温',
            type: 'line',
            unit: 'celsius',
            data: [
              { x: 1, y: 36.5 },
              { x: 2, y: 45 }
            ]
          }
        ]
      })
      const vitalSignsWarningCodeList = (
        editor.command.getChartGraphicValidation(vitalSignsId!)?.warnings || []
      ).map(issue => issue.code)
      expect(vitalSignsWarningCodeList).to.include(
        'chart.series.businessRangeExceeded'
      )

      const unregisterPresetV1 = editor.command.registerChartGraphicPreset({
        id: 'custom.line.validation-governance',
        kind: 'line',
        name: '校验治理折线图',
        version: '1.0.0',
        defaultSize: {
          width: 320,
          height: 160
        },
        defaultSeries: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ]
      })
      const governanceId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'custom.line.validation-governance'
      })
      const unregisterPresetV2 = editor.command.registerChartGraphicPreset({
        id: 'custom.line.validation-governance',
        kind: 'line',
        name: '校验治理折线图',
        version: '1.1.0',
        defaultSize: {
          width: 320,
          height: 160
        },
        defaultSeries: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ]
      })
      const outdatedWarningCodeList = (
        editor.command.getChartGraphicValidation(governanceId!)?.warnings || []
      ).map(issue => issue.code)
      expect(outdatedWarningCodeList).to.include(
        'chart.preset.versionOutdated'
      )
      unregisterPresetV2()
      unregisterPresetV1()
      const missingPresetWarningCodeList = (
        editor.command.getChartGraphicValidation(governanceId!)?.warnings || []
      ).map(issue => issue.code)
      expect(missingPresetWarningCodeList).to.include('chart.preset.missing')

      const unregisterLockedPreset = editor.command.registerChartGraphicPreset({
        id: 'custom.line.validation-locks',
        kind: 'line',
        name: '锁定预设校验图',
        version: '1.0.0',
        defaultSize: {
          width: 400,
          height: 200,
          lockAspectRatio: true
        },
        defaultCoordinate: {
          xAxis: {
            type: 'linear',
            min: 0,
            max: 10
          },
          yAxis: {
            type: 'linear',
            min: 0,
            max: 10
          },
          padding: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
          }
        },
        defaultInteraction: {
          coordinateLocked: true
        },
        defaultSeries: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ]
      })
      editor.command.executeInsertElementList([
        {
          id: 'locked-preset-drift-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 420,
          height: 260,
          chartGraphic: {
            version: 1,
            kind: 'line',
            presetId: 'custom.line.validation-locks',
            presetVersion: '1.0.0',
            title: 'Locked preset drift',
            size: {
              width: 420,
              height: 260,
              lockAspectRatio: true
            },
            coordinate: {
              xAxis: {
                type: 'linear',
                min: 0,
                max: 20
              },
              yAxis: {
                type: 'linear',
                min: 0,
                max: 10
              },
              padding: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
              }
            },
            interaction: {
              coordinateLocked: true
            },
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ]
          }
        },
        {
          id: 'locked-aspect-disabled-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 400,
          height: 200,
          chartGraphic: {
            version: 1,
            kind: 'line',
            presetId: 'custom.line.validation-locks',
            presetVersion: '1.0.0',
            title: 'Locked aspect disabled',
            size: {
              width: 400,
              height: 200,
              lockAspectRatio: false
            },
            coordinate: {
              xAxis: {
                type: 'linear',
                min: 0,
                max: 10
              },
              yAxis: {
                type: 'linear',
                min: 0,
                max: 10
              },
              padding: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
              }
            },
            interaction: {
              coordinateLocked: true
            },
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ]
          }
        }
      ] as any)
      expect(
        (
          editor.command.getChartGraphicValidation('locked-preset-drift-chart')
            ?.warnings || []
        ).map(issue => issue.code)
      ).to.include.members([
        'chart.preset.lockedCoordinateChanged',
        'chart.preset.lockedAspectRatioChanged'
      ])
      expect(
        (
          editor.command.getChartGraphicValidation('locked-aspect-disabled-chart')
            ?.warnings || []
        ).map(issue => issue.code)
      ).to.include('chart.preset.lockedAspectRatioDisabled')

      editor.command.executeInsertElementList([
        {
          id: 'fallback-empty-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 160,
          height: 100,
          chartGraphic: {
            version: 1,
            kind: 'line',
            title: 'Empty fallback',
            size: {
              width: 160,
              height: 100
            },
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ],
            fallback: {}
          }
        },
        {
          id: 'fallback-svg-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 160,
          height: 100,
          chartGraphic: {
            version: 1,
            kind: 'line',
            title: 'SVG fallback without metadata',
            size: {
              width: 160,
              height: 100
            },
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ],
            fallback: {
              svg: '<svg viewBox="0 0 10 10"></svg>',
              png: 'not-a-png-data-url'
            }
          }
        },
        {
          id: 'unsupported-kind-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 160,
          height: 100,
          chartGraphic: {
            version: 1,
            kind: 'unknown',
            title: 'Unsupported kind without fallback',
            size: {
              width: 160,
              height: 100
            },
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ]
          }
        }
      ] as any)
      expect(
        (
          editor.command.getChartGraphicValidation('fallback-empty-chart')
            ?.warnings || []
        ).map(issue => issue.code)
      ).to.include('chart.fallback.empty')
      expect(
        (
          editor.command.getChartGraphicValidation('fallback-svg-chart')
            ?.warnings || []
        ).map(issue => issue.code)
      ).to.include.members([
        'chart.fallback.svgMetadataMissing',
        'chart.fallback.pngInvalid'
      ])
      const unsupportedKindValidation =
        editor.command.getChartGraphicValidation('unsupported-kind-chart')
      expect(
        (unsupportedKindValidation?.errors || []).map(issue => issue.code)
      ).to.include('chart.kindUnsupported')
      expect(
        (unsupportedKindValidation?.warnings || []).map(issue => issue.code)
      ).to.include('chart.fallback.missingForUnsupportedKind')

      editor.command.executeInsertElementList([
        {
          id: 'performance-risk-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 2200,
          height: 1200,
          chartGraphic: {
            version: 1,
            kind: 'line',
            title: 'Performance risk',
            size: {
              width: 2200,
              height: 1200
            },
            coordinate: {
              xAxis: {
                type: 'linear',
                min: 0,
                max: 1000
              },
              yAxis: {
                type: 'linear',
                min: 0,
                max: 100
              }
            },
            series: [
              {
                id: 'dense-a',
                type: 'line',
                data: Array.from({ length: 30001 }, (_, index) => ({
                  x: index,
                  y: index % 100
                }))
              },
              {
                id: 'dense-b',
                type: 'line',
                data: Array.from({ length: 30001 }, (_, index) => ({
                  x: index,
                  y: index % 100
                }))
              },
              {
                id: 'dense-c',
                type: 'line',
                data: Array.from({ length: 30001 }, (_, index) => ({
                  x: index,
                  y: index % 100
                }))
              }
            ],
            pagination: {
              mode: 'time-window',
              windowSize: 10
            }
          }
        },
        {
          id: 'performance-invalid-window-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 320,
          height: 160,
          chartGraphic: {
            version: 1,
            kind: 'line',
            title: 'Invalid time window',
            size: {
              width: 320,
              height: 160
            },
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ],
            pagination: {
              mode: 'time-window',
              windowSize: 0
            }
          }
        },
        {
          id: 'performance-tall-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 320,
          height: 6200,
          chartGraphic: {
            version: 1,
            kind: 'line',
            title: 'Tall vertical slice',
            size: {
              width: 320,
              height: 6200
            },
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ],
            pagination: {
              mode: 'vertical-slice'
            }
          }
        }
      ] as any)
      expect(
        (
          editor.command.getChartGraphicValidation('performance-risk-chart')
            ?.warnings || []
        ).map(issue => issue.code)
      ).to.include.members([
        'chart.performance.renderAreaLarge',
        'chart.performance.seriesPointCountHigh',
        'chart.performance.totalPointCountHigh',
        'chart.performance.timeWindowFragmentCountHigh'
      ])
      expect(
        (
          editor.command.getChartGraphicValidation(
            'performance-invalid-window-chart'
          )?.warnings || []
        ).map(issue => issue.code)
      ).to.include('chart.performance.timeWindowSizeInvalid')
      expect(
        (
          editor.command.getChartGraphicValidation('performance-tall-chart')
            ?.warnings || []
        ).map(issue => issue.code)
      ).to.include('chart.performance.verticalSliceTall')

      const validationList = editor.command.getChartGraphicValidationList()
      const validationIssueList =
        editor.command.getChartGraphicValidationIssueList()
      const validationSummary = editor.command.getChartGraphicValidationSummary()
      expect(validationList.map(entry => entry.chartId)).to.include.members([
        validId,
        'invalid-chart',
        'invalid-dental-chart',
        vitalSignsId,
        governanceId,
        'fallback-empty-chart',
        'fallback-svg-chart',
        'unsupported-kind-chart',
        'locked-preset-drift-chart',
        'locked-aspect-disabled-chart',
        'performance-risk-chart',
        'performance-invalid-window-chart',
        'performance-tall-chart'
      ])
      expect(validationSummary).to.deep.include({
        valid: false,
        checked: validationList.length,
        invalid: 3
      })
      expect(validationSummary.invalidChartIds).to.include.members([
        'invalid-chart',
        'invalid-dental-chart',
        'unsupported-kind-chart'
      ])
      expect(validationSummary.warningChartIds).to.include.members([
        vitalSignsId,
        governanceId,
        'fallback-empty-chart',
        'fallback-svg-chart',
        'unsupported-kind-chart',
        'locked-preset-drift-chart',
        'locked-aspect-disabled-chart',
        'performance-risk-chart',
        'performance-invalid-window-chart',
        'performance-tall-chart'
      ])
      expect(validationSummary.errorCount).to.be.greaterThan(0)
      expect(validationSummary.warningCount).to.be.greaterThan(0)
      expect(validationSummary.entries).to.have.length(validationList.length)
      expect(validationSummary.issueList).to.deep.eq(validationIssueList)
      expect(validationIssueList.length).to.eq(
        validationSummary.errorCount + validationSummary.warningCount
      )
      expect(
        validationIssueList.some(
          issue =>
            issue.chartId === 'invalid-chart' &&
            issue.code === 'chart.plotAreaInvalid' &&
            issue.severity === 'error' &&
            issue.kind === 'line'
        )
      ).to.eq(true)
      expect(
        validationIssueList.some(
          issue =>
            issue.chartId === governanceId &&
            issue.code === 'chart.preset.missing' &&
            issue.severity === 'warning' &&
            issue.presetId === 'custom.line.validation-governance'
        )
      ).to.eq(true)
      unregisterLockedPreset()
    })
  })

  it('summarizes chart template publish audit status', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const boundId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'publish-missing-provider',
          refreshMode: 'manual'
        }
      })
      const staticId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic'
      })

      const unregisterPresetV1 = editor.command.registerChartGraphicPreset({
        id: 'custom.line.publish-audit',
        kind: 'line',
        name: '发布审计折线图',
        version: '1.0.0',
        defaultSize: {
          width: 320,
          height: 160
        },
        defaultSeries: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ]
      })
      const outdatedId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'custom.line.publish-audit'
      })
      const unregisterPresetV2 = editor.command.registerChartGraphicPreset({
        id: 'custom.line.publish-audit',
        kind: 'line',
        name: '发布审计折线图',
        version: '1.1.0',
        defaultSize: {
          width: 320,
          height: 160
        },
        defaultSeries: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ]
      })

      const unregisterMissingPreset = editor.command.registerChartGraphicPreset({
        id: 'custom.line.publish-missing',
        kind: 'line',
        name: '待缺失预设折线图',
        version: '1.0.0',
        defaultSize: {
          width: 320,
          height: 160
        },
        defaultSeries: [
          {
            id: 'series-1',
            type: 'line',
            data: [{ x: 1, y: 1 }]
          }
        ]
      })
      const missingPresetId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'custom.line.publish-missing'
      })
      unregisterMissingPreset()

      editor.command.executeInsertElementList([
        {
          id: 'publish-invalid-chart',
          type: ElementType.CHART_GRAPHIC,
          value: '',
          width: 120,
          height: 80,
          chartGraphic: {
            version: 1,
            kind: 'line',
            title: 'Publish invalid line',
            size: {
              width: 120,
              height: 80
            },
            coordinate: {
              xAxis: {
                type: 'linear',
                min: 10,
                max: 1
              },
              padding: {
                left: 80,
                right: 80
              }
            },
            series: [
              {
                id: 'series-1',
                type: 'line',
                data: [{ x: 1, y: 1 }]
              }
            ]
          }
        } as any
      ])

      const audit = editor.command.getChartGraphicTemplateAuditSummary()
      expect(audit.publishable).to.eq(false)
      expect(audit.checked).to.eq(audit.validation.checked)
      expect(audit.blockingReasons).to.include.members([
        'chart.validation.error',
        'chart.source.providerMissing',
        'chart.source.neverRefreshed',
        'chart.preset.missing'
      ])
      expect(audit.warnings).to.include.members([
        'chart.validation.warning',
        'chart.source.unbound',
        'chart.preset.upgradable'
      ])
      expect(audit.blockingChartIds).to.include.members([
        boundId!,
        missingPresetId!,
        'publish-invalid-chart'
      ])
      expect(audit.warningChartIds).to.include.members([staticId!, outdatedId!])
      expect(audit.warningChartIds).not.to.include(boundId!)
      expect(audit.dataSource.providerMissingChartIds).to.include(boundId!)
      expect(audit.dataSource.neverRefreshedChartIds).to.include(boundId!)
      expect(audit.preset.upgradableChartIds).to.include(outdatedId!)
      expect(audit.preset.missingChartIds).to.include(missingPresetId!)
      expect(audit.validation.invalidChartIds).to.include(
        'publish-invalid-chart'
      )

      unregisterPresetV2()
      unregisterPresetV1()
    })
  })

  it('queries chart graphic internal hits from document coordinates', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const lineId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic'
      })
      expect(lineId).to.be.a('string')
      expect(
        editor.command.executeUpdateChartGraphic(lineId!, {
          title: '命中测试',
          size: { width: 200, height: 120 },
          coordinate: {
            xAxis: { type: 'linear', min: 0, max: 10 },
            yAxis: { type: 'linear', min: 0, max: 10 },
            padding: { top: 10, right: 10, bottom: 10, left: 10 }
          },
          series: [
            {
              id: 'series-1',
              type: 'line',
              symbol: 'circle',
              data: [
                { x: 2, y: 8 },
                { x: 8, y: 2 }
              ]
            }
          ]
        })
      ).to.eq(true)

      const dentalId = editor.command.executeInsertChartGraphic({
        kind: 'dental',
        presetId: 'medical.dental.fdi'
      })
      expect(dentalId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const linePosition = findChartGraphicPosition(editor, lineId!)
      expect(linePosition).to.exist
      const lineHit = editor.command.getChartGraphicHit({
        pageNo: linePosition.pageNo,
        x: linePosition.coordinate.leftTop[0] + 100,
        y: linePosition.coordinate.leftTop[1] + 60
      })
      expect(lineHit?.elementId).to.eq(lineId)
      expect(lineHit?.localX).to.eq(100)
      expect(lineHit?.localY).to.eq(60)
      expect(lineHit?.hit).to.deep.include({
        target: 'series-line',
        seriesId: 'series-1'
      })

      const linePointHit = editor.command.getChartGraphicHit({
        pageNo: linePosition.pageNo,
        x: linePosition.coordinate.leftTop[0] + 46,
        y: linePosition.coordinate.leftTop[1] + 30
      })
      expect(linePointHit?.elementId).to.eq(lineId)
      expect(linePointHit?.hit).to.deep.include({
        target: 'series-point',
        seriesId: 'series-1',
        dataIndex: 0
      })
      const updatedPointHit = editor.command.executeUpdateChartGraphicSeriesPointByHit({
        pageNo: linePosition.pageNo,
        x: linePosition.coordinate.leftTop[0] + 46,
        y: linePosition.coordinate.leftTop[1] + 30,
        patch: { y: 9, label: '首点更新' }
      })
      expect(updatedPointHit?.hit).to.deep.include({
        target: 'series-point',
        seriesId: 'series-1',
        dataIndex: 0
      })
      expect(
        editor.command.getChartGraphic(lineId!)?.series?.[0].data?.[0]
      ).to.deep.eq({
        x: 2,
        y: 9,
        label: '首点更新'
      })
      const insertedPointHit = editor.command.executeInsertChartGraphicSeriesPointByHit({
        pageNo: linePosition.pageNo,
        x: linePosition.coordinate.leftTop[0] + 100,
        y: linePosition.coordinate.leftTop[1] + 60,
        label: '中间插点'
      })
      expect(insertedPointHit?.hit).to.deep.include({
        target: 'series-line',
        seriesId: 'series-1'
      })
      const lineSeriesData = editor.command.getChartGraphic(lineId!)?.series?.[0]
        .data as any[]
      expect(lineSeriesData).to.have.length(3)
      expect(lineSeriesData[1].label).to.eq('中间插点')
      expect(lineSeriesData[1].x).to.be.closeTo(5, 0.2)
      expect(lineSeriesData[1].y).to.be.closeTo(5, 0.2)
      const insertedAnnotationHit =
        editor.command.executeInsertChartGraphicAnnotationByHit({
          pageNo: linePosition.pageNo,
          x: linePosition.coordinate.leftTop[0] + 150,
          y: linePosition.coordinate.leftTop[1] + 40,
          text: '随访提醒'
        })
      expect(insertedAnnotationHit?.hit).to.deep.include({
        target: 'plot-area'
      })
      const lineAnnotations = editor.command.getChartGraphic(lineId!)?.annotations || []
      expect(lineAnnotations).to.have.length(1)
      expect(lineAnnotations[0].text).to.eq('随访提醒')
      expect(lineAnnotations[0].x).to.be.closeTo(7.8, 0.2)
      expect(lineAnnotations[0].y).to.be.closeTo(7, 0.2)
      const insertedMarkHit = editor.command.executeInsertChartGraphicMarkByHit({
        pageNo: linePosition.pageNo,
        x: linePosition.coordinate.leftTop[0] + 120,
        y: linePosition.coordinate.leftTop[1] + 85,
        type: 'warning',
        label: '警示标记'
      })
      expect(insertedMarkHit?.hit).to.deep.include({
        target: 'plot-area'
      })
      const lineMarks = editor.command.getChartGraphic(lineId!)?.marks || []
      expect(lineMarks).to.have.length(1)
      expect(lineMarks[0].type).to.eq('warning')
      expect(lineMarks[0].label).to.eq('警示标记')
      expect(lineMarks[0].x).to.be.closeTo(6.1, 0.2)
      expect(lineMarks[0].y).to.be.closeTo(2.5, 0.2)

      const dentalPosition = findChartGraphicPosition(editor, dentalId!)
      expect(dentalPosition).to.exist
      const dentalSurfacePoint = getDentalTestSurfacePoint()
      const dentalToothPoint = getDentalTestToothPoint()
      const dentalSurfaceHit = editor.command.getChartGraphicHit({
        pageNo: dentalPosition.pageNo,
        x: dentalPosition.coordinate.leftTop[0] + dentalSurfacePoint.x,
        y: dentalPosition.coordinate.leftTop[1] + dentalSurfacePoint.y
      })
      expect(dentalSurfaceHit?.elementId).to.eq(dentalId)
      expect(dentalSurfaceHit?.hit).to.deep.include({
        target: 'dental-surface',
        toothCode: '18',
        dentalSurface: 'buccal'
      })

      const dentalHit = editor.command.getChartGraphicHit({
        pageNo: dentalPosition.pageNo,
        x: dentalPosition.coordinate.leftTop[0] + dentalToothPoint.x,
        y: dentalPosition.coordinate.leftTop[1] + dentalToothPoint.y
      })
      expect(dentalHit?.elementId).to.eq(dentalId)
      expect(dentalHit?.hit).to.deep.include({
        target: 'dental-tooth',
        toothCode: '18'
      })

      const toggledSurfaceHit = editor.command.executeToggleChartGraphicDentalStatusByHit({
        pageNo: dentalPosition.pageNo,
        x: dentalPosition.coordinate.leftTop[0] + dentalSurfacePoint.x,
        y: dentalPosition.coordinate.leftTop[1] + dentalSurfacePoint.y,
        status: 'filled'
      })
      expect(toggledSurfaceHit?.elementId).to.eq(dentalId)
      expect(toggledSurfaceHit?.hit).to.deep.include({
        target: 'dental-surface',
        toothCode: '18',
        dentalSurface: 'buccal'
      })
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '18'
        )?.surfaces?.buccal
      ).to.deep.eq(['filled'])

      expect(
        editor.command.executeToggleChartGraphicDentalStatusByHit({
          pageNo: dentalPosition.pageNo,
          x: dentalPosition.coordinate.leftTop[0] + dentalSurfacePoint.x,
          y: dentalPosition.coordinate.leftTop[1] + dentalSurfacePoint.y,
          status: 'filled'
        })?.hit.target
      ).to.eq('dental-surface')
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '18'
        )?.surfaces?.buccal
      ).to.eq(undefined)

      const toggledToothHit = editor.command.executeToggleChartGraphicDentalStatusByHit({
        pageNo: dentalPosition.pageNo,
        x: dentalPosition.coordinate.leftTop[0] + dentalToothPoint.x,
        y: dentalPosition.coordinate.leftTop[1] + dentalToothPoint.y,
        status: 'implant'
      })
      expect(toggledToothHit?.hit).to.deep.include({
        target: 'dental-tooth',
        toothCode: '18'
      })
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '18'
        )?.status
      ).to.deep.eq(['implant'])

      const clearedDentalHit = editor.command.executeClearChartGraphicDentalStatusByHit({
        pageNo: dentalPosition.pageNo,
        x: dentalPosition.coordinate.leftTop[0] + dentalToothPoint.x,
        y: dentalPosition.coordinate.leftTop[1] + dentalToothPoint.y
      })
      expect(clearedDentalHit?.hit).to.deep.include({
        target: 'dental-tooth',
        toothCode: '18'
      })
      const clearedTooth = editor.command
        .getChartGraphic(dentalId!)
        ?.dental?.teeth.find(tooth => tooth.code === '18')
      expect(clearedTooth?.status).to.eq(undefined)
      expect(clearedTooth?.surfaces).to.eq(undefined)

      editor.command.executeUpdateChartGraphicDentalSurface(
        dentalId!,
        '18',
        'buccal',
        ['filled']
      )
      const deletedDentalSurfaceHit =
        editor.command.executeDeleteChartGraphicTargetByHit({
          pageNo: dentalPosition.pageNo,
          x: dentalPosition.coordinate.leftTop[0] + dentalSurfacePoint.x,
          y: dentalPosition.coordinate.leftTop[1] + dentalSurfacePoint.y
        })
      expect(deletedDentalSurfaceHit?.hit).to.deep.include({
        target: 'dental-surface',
        toothCode: '18',
        dentalSurface: 'buccal'
      })
      expect(
        editor.command.getChartGraphic(dentalId!)?.dental?.teeth.find(
          tooth => tooth.code === '18'
        )?.surfaces?.buccal
      ).to.eq(undefined)

      expect(
        editor.command.executeToggleChartGraphicDentalStatusByHit({
          pageNo: linePosition.pageNo,
          x: linePosition.coordinate.leftTop[0] + 100,
          y: linePosition.coordinate.leftTop[1] + 60,
          status: 'filled'
        })
      ).to.eq(null)
      expect(
        editor.command.executeClearChartGraphicDentalStatusByHit({
          pageNo: linePosition.pageNo,
          x: linePosition.coordinate.leftTop[0] + 100,
          y: linePosition.coordinate.leftTop[1] + 60
        })
      ).to.eq(null)

      expect(
        editor.command.getChartGraphicHit({
          pageNo: dentalPosition.pageNo,
          x: dentalPosition.coordinate.leftTop[0] - 4,
          y: dentalPosition.coordinate.leftTop[1] - 4
        })
      ).to.eq(null)
    })
  })

  it('shares category-axis legend svg worker and hit insert semantics', () => {
    cy.getEditor().then((editor: Editor) => {
      const chartId = 'category-axis-chart'
      editor.command.executeSetValue(
        {
          main: [
            createChartGraphicElement(
              {
                kind: 'line',
                presetId: 'common.line.basic',
                title: 'Category Axis',
                size: { width: 260, height: 160 },
                coordinate: {
                  xAxis: {
                    type: 'category',
                    categories: ['术前', '诱导', '切皮', '缝合']
                  },
                  yAxis: {
                    type: 'linear',
                    min: 0,
                    max: 10,
                    tickInterval: 5
                  },
                  padding: { top: 28, right: 16, bottom: 28, left: 36 }
                },
                series: [
                  {
                    id: 'bp',
                    name: '血压',
                    type: 'line',
                    symbol: 'circle',
                    data: [
                      { x: '术前', y: 3 },
                      { x: '切皮', y: 8 },
                      { x: '缝合', y: 6 }
                    ]
                  },
                  {
                    id: 'hr',
                    name: '心率',
                    type: 'line',
                    symbol: 'square',
                    data: [
                      { x: '术前', y: 4 },
                      { x: '诱导', y: 6 },
                      { x: '缝合', y: 5 }
                    ]
                  }
                ]
              },
              chartId
            )
          ]
        },
        { isSetCursor: true }
      )
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chart = editor.command.getChartGraphic(chartId)!
      const position = findChartGraphicPosition(editor, chartId)
      const draw = (editor as any).draw
      expect(position).to.exist

      const bpPoints = resolveChartSeriesDataPoints(
        chart.series![0],
        chart.coordinate?.xAxis
      )
      expect(bpPoints.map(point => point.x)).to.deep.eq([0, 2, 3])

      const renderContext = resolveChartRenderContext(
        chart,
        chart.size.width,
        chart.size.height
      )
      const legendItemList = resolveChartLegendLayout(
        chart,
        chart.size.width,
        chart.size.height
      )
      expect(legendItemList.map(item => item.label)).to.deep.eq(['血压', '心率'])
      expect(
        hitTestChartGraphic({
          chart,
          width: chart.size.width,
          height: chart.size.height,
          x: legendItemList[0].x + 6,
          y: legendItemList[0].y + 6
        })
      ).to.deep.include({ target: 'legend' })

      const legendHit = editor.command.getChartGraphicHit({
        pageNo: position!.pageNo,
        x: position!.coordinate.leftTop[0] + legendItemList[0].x + 6,
        y: position!.coordinate.leftTop[1] + legendItemList[0].y + 6
      })
      expect(legendHit?.hit).to.deep.include({ target: 'legend' })

      const svg = createPrintSvgChartGraphic(position as any)
      expect(svg).to.contain('术前')
      expect(svg).to.contain('切皮')
      expect(svg).to.contain('血压')
      expect(svg).to.contain('心率')

      const workerCommandList: any[] = []
      pushChartGraphicWorkerSnapshotCommands({
        commandList: workerCommandList,
        element: position!.element,
        rowPosition: position!,
        alpha: 1,
        scale: draw.getRuntime().getOptions().scale
      })
      const workerTextList = workerCommandList
        .filter(command => command.type === 'fillText')
        .map(command => command.text)
      expect(workerTextList).to.include.members([
        '术前',
        '切皮',
        '血压',
        '心率'
      ])

      const hrPoint = resolveChartSeriesDataPoints(
        chart.series![1],
        chart.coordinate?.xAxis
      )[1]
      const hrCoordinate = resolveChartPointCoordinate(hrPoint, renderContext)
      const insertedMarkHit = editor.command.executeInsertChartGraphicMarkByHit({
        pageNo: position!.pageNo,
        x: position!.coordinate.leftTop[0] + hrCoordinate.x,
        y: position!.coordinate.leftTop[1] + hrCoordinate.y,
        type: 'event',
        label: '分类轴标记'
      })
      expect(insertedMarkHit?.hit).to.deep.include({
        target: 'series-point',
        seriesId: 'hr'
      })
      const marks = editor.command.getChartGraphic(chartId)?.marks || []
      expect(marks).to.have.length(1)
      expect(marks[0]).to.deep.include({
        label: '分类轴标记',
        x: '诱导'
      })
      expect(marks[0].y).to.be.closeTo(6, 0.2)
    })
  })

  it('renders grouped bar preset and hit-tests bar columns', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      expect(
        editor.command
          .getChartGraphicPresetList('line')
          .some(preset => preset.id === 'common.bar.basic')
      ).to.eq(true)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.bar.basic'
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chart = editor.command.getChartGraphic(chartId!)!
      const position = findChartGraphicPosition(editor, chartId!)
      const draw = (editor as any).draw
      expect(position).to.exist
      expect(chart.series?.every(series => series.type === 'bar')).to.eq(true)

      const renderContext = resolveChartRenderContext(
        chart,
        chart.size.width,
        chart.size.height
      )
      const firstPoint = resolveChartSeriesDataPoints(
        chart.series![0],
        chart.coordinate?.xAxis
      )[0]
      const firstBarRect = resolveChartBarRect({
        chart,
        series: chart.series![0],
        point: firstPoint,
        context: renderContext
      })
      expect(firstBarRect).to.exist

      const hit = editor.command.getChartGraphicHit({
        pageNo: position!.pageNo,
        x: position!.coordinate.leftTop[0] + firstBarRect!.x + firstBarRect!.width / 2,
        y: position!.coordinate.leftTop[1] + firstBarRect!.y + 12
      })
      expect(hit?.hit).to.deep.include({
        target: 'series-point',
        seriesId: 'outpatient',
        dataIndex: 0
      })

      const updatedPointHit = editor.command.executeUpdateChartGraphicSeriesPointByHit({
        pageNo: position!.pageNo,
        x: position!.coordinate.leftTop[0] + firstBarRect!.x + firstBarRect!.width / 2,
        y: position!.coordinate.leftTop[1] + firstBarRect!.y + 12,
        patch: { y: 40, label: '柱状更新' }
      })
      expect(updatedPointHit?.hit).to.deep.include({
        target: 'series-point',
        seriesId: 'outpatient',
        dataIndex: 0
      })
      expect((editor.command.getChartGraphic(chartId!)?.series?.[0].data as any[])[0]).to.deep.eq({
        x: '一月',
        y: 40,
        label: '柱状更新'
      })

      const svg = createPrintSvgChartGraphic(position as any)
      expect(svg).to.contain('基础柱状图')
      expect(svg).to.contain('门诊')
      expect(svg).to.contain('急诊')
      expect(svg).to.contain('一月')

      const workerCommandList: any[] = []
      pushChartGraphicWorkerSnapshotCommands({
        commandList: workerCommandList,
        element: position!.element,
        rowPosition: position!,
        alpha: 1,
        scale: draw.getRuntime().getOptions().scale
      })
      expect(
        workerCommandList.some(
          command =>
            command.type === 'fillRect' &&
            (command.fillStyle === '#2563eb' || command.fillStyle === '#dc2626')
        )
      ).to.eq(true)
    })
  })

  it('deletes chart graphic targets directly from hit coordinates', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Delete By Hit',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ],
        marks: [{ id: 'mark-1', type: 'event', x: 2, y: 2, label: '事件' }],
        regions: [
          {
            id: 'region-1',
            type: 'range',
            xStart: 6,
            xEnd: 8,
            yStart: 1,
            yEnd: 3
          }
        ],
        annotations: [{ id: 'note-1', x: 1, y: 9, text: '说明' }]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist

      const deleteMarkHit = editor.command.executeDeleteChartGraphicTargetByHit({
        pageNo: chartPosition.pageNo,
        x: chartPosition.coordinate.leftTop[0] + 46,
        y: chartPosition.coordinate.leftTop[1] + 30
      })
      expect(deleteMarkHit?.hit).to.deep.include({
        target: 'series-point',
        seriesId: 'series-1',
        dataIndex: 0
      })
      expect(
        editor.command.getChartGraphic(chartId!)?.series?.find(
          series => series.id === 'series-1'
        )?.data
      ).to.deep.eq([{ x: 8, y: 2 }])

      const deleteRealMarkHit = editor.command.executeDeleteChartGraphicTargetByHit({
        pageNo: chartPosition.pageNo,
        x: chartPosition.coordinate.leftTop[0] + 46,
        y: chartPosition.coordinate.leftTop[1] + 90
      })
      expect(deleteRealMarkHit?.hit).to.deep.include({
        target: 'mark',
        markId: 'mark-1'
      })
      expect(editor.command.getChartGraphic(chartId!)?.marks).to.have.length(0)

      const deleteRegionHit = editor.command.executeDeleteChartGraphicTargetByHit({
        pageNo: chartPosition.pageNo,
        x: chartPosition.coordinate.leftTop[0] + 150,
        y: chartPosition.coordinate.leftTop[1] + 98
      })
      expect(deleteRegionHit?.hit).to.deep.include({
        target: 'region',
        regionId: 'region-1'
      })
      expect(editor.command.getChartGraphic(chartId!)?.regions).to.have.length(0)

      const deleteAnnotationHit =
        editor.command.executeDeleteChartGraphicTargetByHit({
          pageNo: chartPosition.pageNo,
          x: chartPosition.coordinate.leftTop[0] + 33,
          y: chartPosition.coordinate.leftTop[1] + 20
        })
      expect(deleteAnnotationHit?.hit).to.deep.include({
        target: 'annotation',
        annotationId: 'note-1'
      })
      expect(editor.command.getChartGraphic(chartId!)?.annotations).to.have.length(0)

      expect(
        editor.command.executeDeleteChartGraphicTargetByHit({
          pageNo: chartPosition.pageNo,
          x: chartPosition.coordinate.leftTop[0] + 100,
          y: chartPosition.coordinate.leftTop[1] + 60
        })
      ).to.eq(null)
    })
  })

  it('opens dental chart context menus and clears statuses', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const dentalId = editor.command.executeInsertChartGraphic({
        kind: 'dental',
        presetId: 'medical.dental.fdi'
      })
      expect(dentalId).to.be.a('string')
      expect(
        editor.command.executeUpdateChartGraphicDentalSurface(
          dentalId!,
          '18',
          'buccal',
          ['filled']
        )
      ).to.eq(true)
      expect(
        editor.command.executeUpdateChartGraphicDentalTooth(dentalId!, '18', {
          status: ['implant']
        })
      ).to.eq(true)
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draw = (editor as any).draw
      const dentalPosition = findChartGraphicPosition(editor, dentalId!)
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        dentalPosition.pageNo
      ]
      const dentalSurfacePoint = getDentalTestSurfacePoint()
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(
          editor,
          dentalPosition,
          dentalSurfacePoint.x,
          dentalSurfacePoint.y,
          'contextmenu'
        )
      )
    })

    cy.contains('.ce-contextmenu-item span', '清除牙位状态').click()

    cy.getEditor().then((editor: Editor) => {
      const dental = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.kind === 'dental'
      )?.chartGraphic
      expect(
        dental?.dental?.teeth.find(tooth => tooth.code === '18')?.surfaces?.buccal
      ).to.eq(undefined)
      expect(
        dental?.dental?.teeth.find(tooth => tooth.code === '18')?.status
      ).to.deep.eq(['implant'])
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const dentalPosition = findChartGraphicPosition(
        editor,
        findChartGraphicElementList(editor).find(
          element => element.chartGraphic?.kind === 'dental'
        )!.id!
      )
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        dentalPosition.pageNo
      ]
      const dentalToothPoint = getDentalTestToothPoint()
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(
          editor,
          dentalPosition,
          dentalToothPoint.x,
          dentalToothPoint.y,
          'contextmenu'
        )
      )
    })

    cy.contains('.ce-contextmenu-item span', '清除牙位状态').click()

    cy.getEditor().then((editor: Editor) => {
      const dental = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.kind === 'dental'
      )?.chartGraphic
      const tooth18 = dental?.dental?.teeth.find(tooth => tooth.code === '18')
      expect(tooth18?.status).to.eq(undefined)
      expect(tooth18?.surfaces).to.eq(undefined)
    })
  })

  it('opens dental chart context menus and edits tooth notes', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const dentalId = editor.command.executeInsertChartGraphic({
        kind: 'dental',
        presetId: 'medical.dental.fdi'
      })
      expect(dentalId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draw = (editor as any).draw
      const dentalPosition = findChartGraphicPosition(editor, dentalId!)
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        dentalPosition.pageNo
      ]
      const dentalToothPoint = getDentalTestToothPoint()
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(
          editor,
          dentalPosition,
          dentalToothPoint.x,
          dentalToothPoint.y,
          'contextmenu'
        )
      )
    })

    cy.contains('.ce-contextmenu-item span', '编辑牙位备注').click()
    cy.get('.dialog-container textarea[name="notes"]').clear().type('牙位备注已更新')
    cy.get('.dialog-container button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const dental = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.kind === 'dental'
      )?.chartGraphic
      expect(
        dental?.dental?.teeth.find(tooth => tooth.code === '18')?.notes
      ).to.eq('牙位备注已更新')
    })
  })

  it('opens chart context menus and refreshes source-bound charts', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        source: {
          sourceId: 'contextmenu-vitals',
          refreshMode: 'manual',
          version: 'before-refresh'
        }
      })
      expect(chartId).to.be.a('string')

      let loadCount = 0
      const unregister = editor.command.registerChartGraphicDataProvider({
        sourceId: 'contextmenu-vitals',
        async load(payload) {
          loadCount++
          expect(payload.chartId).to.eq(chartId)
          return {
            title: '右键刷新完成',
            source: {
              ...payload.source,
              version: 'after-refresh'
            }
          }
        }
      })

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 100, 60, 'contextmenu')
      )

      cy.contains('.ce-contextmenu-item', '刷新图表数据').click()
      cy.wrap(null, { timeout: 10000 }).should(() => {
        expect(loadCount).to.eq(1)
        const chart = editor.command.getChartGraphic(chartId!)
        expect(chart?.title).to.eq('右键刷新完成')
        expect(chart?.source?.version).to.eq('after-refresh')
      }).then(() => {
        unregister()
      })
    })
  })

  it('opens coordinate chart context menus and deletes hit targets', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Contextmenu Hit Targets',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ],
        marks: [{ id: 'mark-1', type: 'event', x: 2, y: 2, label: '事件' }],
        regions: [
          {
            id: 'region-1',
            type: 'range',
            xStart: 6,
            xEnd: 8,
            yStart: 1,
            yEnd: 3
          }
        ],
        annotations: [{ id: 'note-1', x: 1, y: 9, text: '说明' }]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]

      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 46, 30, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item span', '删除点位').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Hit Targets'
      )?.chartGraphic
      expect(
        chart?.series?.find(series => series.id === 'series-1')?.data
      ).to.deep.eq([{ x: 8, y: 2 }])

      const chartPosition = findChartGraphicPosition(
        editor,
        findChartGraphicElementList(editor).find(
          element => element.chartGraphic?.title === 'Contextmenu Hit Targets'
        )!.id!
      )
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]

      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 46, 90, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item', '删除标记').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Hit Targets'
      )?.chartGraphic
      expect(chart?.marks).to.have.length(0)

      const chartPosition = findChartGraphicPosition(
        editor,
        findChartGraphicElementList(editor).find(
          element => element.chartGraphic?.title === 'Contextmenu Hit Targets'
        )!.id!
      )
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 150, 98, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item', '删除区间').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Hit Targets'
      )?.chartGraphic
      expect(chart?.regions).to.have.length(0)

      const chartPosition = findChartGraphicPosition(
        editor,
        findChartGraphicElementList(editor).find(
          element => element.chartGraphic?.title === 'Contextmenu Hit Targets'
        )!.id!
      )
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 33, 20, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item', '删除标注').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Hit Targets'
      )?.chartGraphic
      expect(chart?.annotations).to.have.length(0)
    })
  })

  it('opens coordinate chart context menus and edits point values', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Contextmenu Edit Point',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8, label: '原始点位' },
              { x: 8, y: 2 }
            ]
          }
        ]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 46, 30, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item span', '编辑点位').click()
    cy.get('.dialog-container input[name="x"]').clear().type('3')
    cy.get('.dialog-container input[name="y"]').clear().type('9')
    cy.get('.dialog-container input[name="label"]').clear().type('已更新')
    cy.get('.dialog-container button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Edit Point'
      )?.chartGraphic
      expect(chart?.series?.[0].data?.[0]).to.deep.eq({
        x: 3,
        y: 9,
        label: '已更新'
      })
    })
  })

  it('opens coordinate chart context menus and inserts points', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Contextmenu Insert Point',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 100, 60, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item span', '插入点位').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Insert Point'
      )?.chartGraphic
      const seriesData = chart?.series?.[0].data as any[]
      expect(seriesData).to.have.length(3)
      expect(seriesData[1].x).to.be.closeTo(5, 0.2)
      expect(seriesData[1].y).to.be.closeTo(5, 0.2)
    })
  })

  it('opens coordinate chart context menus and inserts annotations', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Contextmenu Insert Annotation',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 150, 40, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item span', '添加标注').click()
    cy.get('.dialog-container input[name="text"]').clear().type('补记说明')
    cy.get('.dialog-container button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Insert Annotation'
      )?.chartGraphic
      expect(chart?.annotations).to.have.length(1)
      expect(chart?.annotations?.[0].text).to.eq('补记说明')
      expect(chart?.annotations?.[0].x).to.be.closeTo(7.8, 0.2)
      expect(chart?.annotations?.[0].y).to.be.closeTo(7, 0.2)
    })
  })

  it('opens coordinate chart context menus and inserts marks', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Contextmenu Insert Mark',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 150, 40, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item span', '添加标记').click()
    cy.get('.dialog-container select[name="type"]').select('medication')
    cy.get('.dialog-container input[name="label"]').clear().type('催产素追加')
    cy.get('.dialog-container button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Insert Mark'
      )?.chartGraphic
      expect(chart?.marks).to.have.length(1)
      expect(chart?.marks?.[0].type).to.eq('medication')
      expect(chart?.marks?.[0].label).to.eq('催产素追加')
      expect(chart?.marks?.[0].x).to.be.closeTo(7.8, 0.2)
      expect(chart?.marks?.[0].y).to.be.closeTo(7, 0.2)
    })
  })

  it('drags chart series points and commits as a single undo step', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Drag Editable Chart',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      expect(
        editor.command.executeUpdateChartGraphicSeriesPoint(
          chartId!,
          'series-1',
          0,
          { label: 'baseline-point' }
        )
      ).to.eq(true)
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chart = editor.command.getChartGraphic(chartId!)!
      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const renderContext = resolveChartRenderContext(
        chart,
        chart.size.width,
        chart.size.height
      )
      const series = chart.series?.[0]
      expect(series).to.exist
      if (!series) throw new Error('Expected chart series')
      const startPoint = resolveChartPointCoordinate(
        resolveChartSeriesDataPoints(
          series,
          chart.coordinate?.xAxis
        )[0],
        renderContext
      )
      const targetLocalPoint = {
        x: 122,
        y: 76
      }
      const expectedPoint = resolveChartAxisPointValueFromLocalCoordinate({
        chart,
        width: chart.size.width,
        height: chart.size.height,
        localX: targetLocalPoint.x,
        localY: targetLocalPoint.y
      })

      dispatchChartPointDrag({
        editor,
        position: chartPosition,
        from: startPoint,
        to: targetLocalPoint,
        intermediateList: [
          {
            x: (startPoint.x + targetLocalPoint.x) / 2,
            y: (startPoint.y + targetLocalPoint.y) / 2
          }
        ]
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draggedPoint = editor.command.getChartGraphic(chartId!)?.series?.[0]
        .data?.[0] as { x: number; y: number; label?: string }
      expect(draggedPoint.x).to.be.closeTo(expectedPoint.x as number, 0.2)
      expect(draggedPoint.y).to.be.closeTo(expectedPoint.y, 0.2)
      expect(draggedPoint.label).to.eq('baseline-point')
      expect(
        editor.command.getChartGraphic(chartId!)?.series?.[0].data?.[1]
      ).to.deep.eq({
        x: 8,
        y: 2
      })

      editor.command.executeUndo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(
        editor.command.getChartGraphic(chartId!)?.series?.[0].data?.[0]
      ).to.deep.eq({
        x: 2,
        y: 8,
        label: 'baseline-point'
      })

      editor.command.executeRedo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      const redonePoint = editor.command.getChartGraphic(chartId!)?.series?.[0]
        .data?.[0] as { x: number; y: number; label?: string }
      expect(redonePoint.x).to.be.closeTo(expectedPoint.x as number, 0.2)
      expect(redonePoint.y).to.be.closeTo(expectedPoint.y, 0.2)
      expect(redonePoint.label).to.eq('baseline-point')
    })
  })

  it('drags chart marks and annotations with single-step undo', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Drag Chart Targets',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ],
        marks: [{ id: 'mark-1', type: 'event', x: 2, y: 2, label: '事件' }],
        annotations: [{ id: 'note-1', x: 1, y: 9, text: '说明' }]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      expect(
        editor.command.executeUpdateChartGraphic(chartId!, {
          title: 'Drag Chart Targets Baseline'
        })
      ).to.eq(true)
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chart = editor.command.getChartGraphic(chartId!)!
      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const renderContext = resolveChartRenderContext(
        chart,
        chart.size.width,
        chart.size.height
      )
      const markStartPoint = resolveChartPointCoordinate(
        {
          x: chart.marks?.[0].x as number,
          y: chart.marks?.[0].y as number
        },
        renderContext
      )
      const markTargetLocalPoint = {
        x: 132,
        y: 74
      }
      const expectedMarkPoint = resolveChartAxisPointValueFromLocalCoordinate({
        chart,
        width: chart.size.width,
        height: chart.size.height,
        localX: markTargetLocalPoint.x,
        localY: markTargetLocalPoint.y
      })

      dispatchChartPointDrag({
        editor,
        position: chartPosition,
        from: markStartPoint,
        to: markTargetLocalPoint
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draggedMark = editor.command.getChartGraphic(chartId!)?.marks?.[0]
      expect(draggedMark?.x).to.be.closeTo(expectedMarkPoint.x as number, 0.2)
      expect(draggedMark?.y).to.be.closeTo(expectedMarkPoint.y, 0.2)
      expect(draggedMark?.label).to.eq('事件')
      expect(editor.command.getChartGraphic(chartId!)?.title).to.eq(
        'Drag Chart Targets Baseline'
      )

      editor.command.executeUndo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(editor.command.getChartGraphic(chartId!)?.marks?.[0]).to.deep.eq({
        id: 'mark-1',
        type: 'event',
        x: 2,
        y: 2,
        label: '事件'
      })
      expect(editor.command.getChartGraphic(chartId!)?.title).to.eq(
        'Drag Chart Targets Baseline'
      )

      editor.command.executeRedo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      const redoneMark = editor.command.getChartGraphic(chartId!)?.marks?.[0]
      expect(redoneMark?.x).to.be.closeTo(expectedMarkPoint.x as number, 0.2)
      expect(redoneMark?.y).to.be.closeTo(expectedMarkPoint.y, 0.2)
      expect(redoneMark?.label).to.eq('事件')

      const annotationStartAnchor = resolveChartPointCoordinate(
        {
          x: chart.annotations?.[0].x as number,
          y: chart.annotations?.[0].y as number
        },
        renderContext
      )
      const annotationStartPoint = {
        x: annotationStartAnchor.x + 8,
        y: annotationStartAnchor.y
      }
      const annotationTargetLocalPoint = {
        x: 110,
        y: 44
      }
      const expectedAnnotationPoint =
        resolveChartAxisPointValueFromLocalCoordinate({
          chart,
          width: chart.size.width,
          height: chart.size.height,
          localX: annotationTargetLocalPoint.x,
          localY: annotationTargetLocalPoint.y
        })

      dispatchChartPointDrag({
        editor,
        position: chartPosition,
        from: annotationStartPoint,
        to: annotationTargetLocalPoint
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draggedAnnotation = editor.command.getChartGraphic(chartId!)
        ?.annotations?.[0]
      expect(draggedAnnotation?.x).to.be.closeTo(
        expectedAnnotationPoint.x as number,
        0.2
      )
      expect(draggedAnnotation?.y).to.be.closeTo(expectedAnnotationPoint.y, 0.2)
      expect(draggedAnnotation?.text).to.eq('说明')
      expect(editor.command.getChartGraphic(chartId!)?.title).to.eq(
        'Drag Chart Targets Baseline'
      )

      editor.command.executeUndo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(editor.command.getChartGraphic(chartId!)?.annotations?.[0]).to.deep.eq({
        id: 'note-1',
        x: 1,
        y: 9,
        text: '说明'
      })
      expect(editor.command.getChartGraphic(chartId!)?.title).to.eq(
        'Drag Chart Targets Baseline'
      )

      editor.command.executeRedo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      const redoneAnnotation = editor.command.getChartGraphic(chartId!)
        ?.annotations?.[0]
      expect(redoneAnnotation?.x).to.be.closeTo(
        expectedAnnotationPoint.x as number,
        0.2
      )
      expect(redoneAnnotation?.y).to.be.closeTo(
        expectedAnnotationPoint.y,
        0.2
      )
      expect(redoneAnnotation?.text).to.eq('说明')
    })
  })

  it('drags chart regions with single-step undo', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Drag Chart Region',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [],
        regions: [
          {
            id: 'region-1',
            type: 'warning',
            xStart: 2,
            xEnd: 4,
            yStart: 2,
            yEnd: 6,
            label: '风险区间',
            color: '#fee2e2'
          }
        ]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      expect(
        editor.command.executeUpdateChartGraphic(chartId!, {
          title: 'Drag Chart Region Baseline'
        })
      ).to.eq(true)
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chart = editor.command.getChartGraphic(chartId!)!
      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const renderContext = resolveChartRenderContext(
        chart,
        chart.size.width,
        chart.size.height
      )
      const startPoint = resolveChartPointCoordinate(
        { x: 3, y: 4 },
        renderContext
      )
      const targetPoint = resolveChartPointCoordinate(
        { x: 5, y: 5 },
        renderContext
      )

      dispatchChartPointDrag({
        editor,
        position: chartPosition,
        from: startPoint,
        to: targetPoint
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      expect(editor.command.getChartGraphic(chartId!)?.regions?.[0]).to.deep.eq({
        id: 'region-1',
        type: 'warning',
        xStart: 4,
        xEnd: 6,
        yStart: 3,
        yEnd: 7,
        label: '风险区间',
        color: '#fee2e2'
      })

      editor.command.executeUndo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(editor.command.getChartGraphic(chartId!)?.regions?.[0]).to.deep.eq({
        id: 'region-1',
        type: 'warning',
        xStart: 2,
        xEnd: 4,
        yStart: 2,
        yEnd: 6,
        label: '风险区间',
        color: '#fee2e2'
      })

      editor.command.executeRedo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(editor.command.getChartGraphic(chartId!)?.regions?.[0]).to.deep.eq({
        id: 'region-1',
        type: 'warning',
        xStart: 4,
        xEnd: 6,
        yStart: 3,
        yEnd: 7,
        label: '风险区间',
        color: '#fee2e2'
      })
    })
  })

  it('blocks dragging readonly chart marks and annotations', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Readonly Drag Targets',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        interaction: {
          readonly: true
        },
        marks: [{ id: 'mark-1', type: 'event', x: 2, y: 2, label: '事件' }],
        annotations: [{ id: 'note-1', x: 1, y: 9, text: '说明' }]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chart = editor.command.getChartGraphic(chartId!)!
      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const renderContext = resolveChartRenderContext(
        chart,
        chart.size.width,
        chart.size.height
      )
      const markStartPoint = resolveChartPointCoordinate(
        {
          x: chart.marks?.[0].x as number,
          y: chart.marks?.[0].y as number
        },
        renderContext
      )
      const annotationAnchor = resolveChartPointCoordinate(
        {
          x: chart.annotations?.[0].x as number,
          y: chart.annotations?.[0].y as number
        },
        renderContext
      )

      dispatchChartPointDrag({
        editor,
        position: chartPosition,
        from: markStartPoint,
        to: {
          x: 132,
          y: 74
        }
      })
      dispatchChartPointDrag({
        editor,
        position: chartPosition,
        from: {
          x: annotationAnchor.x + 8,
          y: annotationAnchor.y
        },
        to: {
          x: 110,
          y: 44
        }
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      expect(editor.command.getChartGraphic(chartId!)?.marks?.[0]).to.deep.eq({
        id: 'mark-1',
        type: 'event',
        x: 2,
        y: 2,
        label: '事件'
      })
      expect(editor.command.getChartGraphic(chartId!)?.annotations?.[0]).to.deep.eq({
        id: 'note-1',
        x: 1,
        y: 9,
        text: '说明'
      })
    })
  })

  it('keeps readonly chart graphics selectable but blocks hit edits', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Readonly Chart',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        interaction: {
          readonly: true
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist

      const insertPayload = {
        pageNo: chartPosition.pageNo,
        x: chartPosition.coordinate.leftTop[0] + 100,
        y: chartPosition.coordinate.leftTop[1] + 60,
        label: '不应插入'
      }
      expect(editor.command.getChartGraphicHit(insertPayload)?.hit).to.deep.include({
        target: 'series-line',
        seriesId: 'series-1'
      })
      expect(
        editor.command.executeInsertChartGraphicSeriesPointByHit(insertPayload)
      ).to.eq(null)
      expect(
        editor.command.getChartGraphic(chartId!)?.series?.[0].data
      ).to.deep.eq([
        { x: 2, y: 8 },
        { x: 8, y: 2 }
      ])

      const draw = (editor as any).draw
      const element = draw.getObjectResolver().getElementList().find(
        item => item.id === chartId
      )!
      handleImageSelectionStart({
        draw,
        evt: createMouseEventAtLocalOffset(
          editor,
          chartPosition,
          100,
          60,
          'mousedown'
        ),
        element,
        position: chartPosition,
        isReadonly: false,
        isDirectHitImage: true,
        captureDragSnapshot: () => undefined
      })

      const handleList = Array.from(
        editor.command
          .getContainer()
          .querySelectorAll<HTMLElement>('.resizer-handle')
      )
      expect(handleList.length).to.be.greaterThan(0)
      expect(handleList.every(handle => handle.style.display === 'none')).to.eq(
        true
      )

      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(
          editor,
          chartPosition,
          100,
          60,
          'contextmenu'
        )
      )
    })

    cy.get('.ce-contextmenu-container').should('be.visible')
    cy.get('.ce-contextmenu-item span').should('not.contain', '添加标记')
    cy.get('.ce-contextmenu-item span').should('not.contain', '插入点位')
    cy.get('.ce-contextmenu-item span').should('not.contain', '编辑点位')
    cy.get('.ce-contextmenu-item span').should('not.contain', '删除点位')
  })

  it('blocks dragging readonly chart series points', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Readonly Drag Chart',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        interaction: {
          readonly: true
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chart = editor.command.getChartGraphic(chartId!)!
      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const renderContext = resolveChartRenderContext(
        chart,
        chart.size.width,
        chart.size.height
      )
      const series = chart.series?.[0]
      expect(series).to.exist
      if (!series) throw new Error('Expected chart series')
      const startPoint = resolveChartPointCoordinate(
        resolveChartSeriesDataPoints(
          series,
          chart.coordinate?.xAxis
        )[0],
        renderContext
      )

      dispatchChartPointDrag({
        editor,
        position: chartPosition,
        from: startPoint,
        to: {
          x: 122,
          y: 76
        }
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      expect(editor.command.getChartGraphic(chartId!)?.series?.[0].data).to.deep.eq([
        { x: 2, y: 8 },
        { x: 8, y: 2 }
      ])
    })
  })

  it('opens coordinate chart context menus and edits marks regions annotations', () => {
    cy.getEditor().then((editor: Editor) => {
      resetDocument(editor)

      const chartId = editor.command.executeInsertChartGraphic({
        kind: 'line',
        presetId: 'common.line.basic',
        title: 'Contextmenu Edit Targets',
        size: { width: 200, height: 120 },
        coordinate: {
          xAxis: { type: 'linear', min: 0, max: 10 },
          yAxis: { type: 'linear', min: 0, max: 10 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        series: [
          {
            id: 'series-1',
            type: 'line',
            symbol: 'circle',
            data: [
              { x: 2, y: 8 },
              { x: 8, y: 2 }
            ]
          }
        ],
        marks: [{ id: 'mark-1', type: 'event', x: 2, y: 2, label: '事件' }],
        regions: [
          {
            id: 'region-1',
            type: 'range',
            xStart: 6,
            xEnd: 8,
            yStart: 1,
            yEnd: 3,
            label: '区间'
          }
        ],
        annotations: [{ id: 'note-1', x: 1, y: 9, text: '说明' }]
      })
      expect(chartId).to.be.a('string')
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const chartPosition = findChartGraphicPosition(editor, chartId!)
      expect(chartPosition).to.exist
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 46, 90, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item span', '编辑标记').click()
    cy.get('.dialog-container input[name="label"]').clear().type('事件已编辑')
    cy.get('.dialog-container button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Edit Targets'
      )?.chartGraphic
      expect(chart?.marks?.[0].label).to.eq('事件已编辑')

      const chartPosition = findChartGraphicPosition(
        editor,
        findChartGraphicElementList(editor).find(
          element => element.chartGraphic?.title === 'Contextmenu Edit Targets'
        )!.id!
      )
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 150, 98, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item span', '编辑区间').click()
    cy.get('.dialog-container input[name="label"]').clear().type('区间已编辑')
    cy.get('.dialog-container button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Edit Targets'
      )?.chartGraphic
      expect(chart?.regions?.[0].label).to.eq('区间已编辑')

      const chartPosition = findChartGraphicPosition(
        editor,
        findChartGraphicElementList(editor).find(
          element => element.chartGraphic?.title === 'Contextmenu Edit Targets'
        )!.id!
      )
      const draw = (editor as any).draw
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        chartPosition.pageNo
      ]
      pageWrapper.dispatchEvent(
        createMouseEventAtLocalOffset(editor, chartPosition, 33, 20, 'contextmenu')
      )
    })

    cy.contains('.ce-contextmenu-item span', '编辑标注').click()
    cy.get('.dialog-container input[name="text"]').clear().type('标注已编辑')
    cy.get('.dialog-container button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = findChartGraphicElementList(editor).find(
        element => element.chartGraphic?.title === 'Contextmenu Edit Targets'
      )?.chartGraphic
      expect(chart?.annotations?.[0].text).to.eq('标注已编辑')
    })
  })

  it('queries chart graphic hits from cross-page document coordinates without pageNo', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          main: [
            ...Array.from({ length: 180 }, (_, index) => ({
              value: `cross-page filler ${index}\n`
            })),
            createChartGraphicElement(
              {
                kind: 'line',
                presetId: 'common.line.basic',
                title: 'Cross Page Line',
                size: { width: 200, height: 120 },
                coordinate: {
                  xAxis: { type: 'linear', min: 0, max: 10 },
                  yAxis: { type: 'linear', min: 0, max: 10 },
                  padding: { top: 10, right: 10, bottom: 10, left: 10 }
                },
                series: [
                  {
                    id: 'series-1',
                    type: 'line',
                    symbol: 'circle',
                    data: [
                      { x: 2, y: 8 },
                      { x: 8, y: 2 }
                    ]
                  }
                ]
              },
              'cross-page-line'
            ),
            { value: '\n' },
            createChartGraphicElement(
              {
                kind: 'dental',
                presetId: 'medical.dental.fdi',
                title: 'Cross Page Dental'
              },
              'cross-page-dental'
            )
          ]
        },
        { isSetCursor: true }
      )
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draw = (editor as any).draw
      const pageHeight = draw.getOriginalHeight()
      const pageGap = draw.getOriginalPageGap()

      const linePosition = findChartGraphicPosition(editor, 'cross-page-line')
      expect(linePosition).to.exist
      expect(linePosition.pageNo).to.be.greaterThan(0)
      const lineHit = editor.command.getChartGraphicHit({
        x: linePosition.coordinate.leftTop[0] + 100,
        y:
          linePosition.coordinate.leftTop[1] +
          linePosition.pageNo * (pageHeight + pageGap) +
          60
      })
      expect(lineHit?.pageNo).to.eq(linePosition.pageNo)
      expect(lineHit?.elementId).to.eq('cross-page-line')
      expect(lineHit?.hit).to.deep.include({
        target: 'series-line',
        seriesId: 'series-1'
      })

      const dentalPosition = findChartGraphicPosition(editor, 'cross-page-dental')
      expect(dentalPosition).to.exist
      expect(dentalPosition.pageNo).to.be.greaterThan(0)
      const dentalSurfacePoint = getDentalTestSurfacePoint()
      const dentalSurfaceHit = editor.command.getChartGraphicHit({
        x: dentalPosition.coordinate.leftTop[0] + dentalSurfacePoint.x,
        y:
          dentalPosition.coordinate.leftTop[1] +
          dentalPosition.pageNo * (pageHeight + pageGap) +
          dentalSurfacePoint.y
      })
      expect(dentalSurfaceHit?.pageNo).to.eq(dentalPosition.pageNo)
      expect(dentalSurfaceHit?.elementId).to.eq('cross-page-dental')
      expect(dentalSurfaceHit?.hit).to.deep.include({
        target: 'dental-surface',
        toothCode: '18',
        dentalSurface: 'buccal'
      })

      const toggledCrossPageSurfaceHit =
        editor.command.executeToggleChartGraphicDentalStatusByHit({
          x: dentalPosition.coordinate.leftTop[0] + dentalSurfacePoint.x,
          y:
            dentalPosition.coordinate.leftTop[1] +
            dentalPosition.pageNo * (pageHeight + pageGap) +
            dentalSurfacePoint.y,
          status: 'filled'
        })
      expect(toggledCrossPageSurfaceHit?.pageNo).to.eq(dentalPosition.pageNo)
      expect(toggledCrossPageSurfaceHit?.hit).to.deep.include({
        target: 'dental-surface',
        toothCode: '18',
        dentalSurface: 'buccal'
      })
      expect(
        editor.command.getChartGraphic('cross-page-dental')?.dental?.teeth.find(
          tooth => tooth.code === '18'
        )?.surfaces?.buccal
      ).to.deep.eq(['filled'])
    })
  })

  it('fragments oversized chart graphics across pages and keeps hit svg worker output aligned', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          main: [
            createChartGraphicElement(
              {
                kind: 'line',
                presetId: 'common.line.basic',
                title: 'Fragmented Line',
                size: { width: 320, height: 1600 },
                coordinate: {
                  xAxis: { type: 'linear', min: 0, max: 10 },
                  yAxis: { type: 'linear', min: 0, max: 100 },
                  padding: { top: 10, right: 10, bottom: 10, left: 10 }
                },
                series: [
                  {
                    id: 'series-1',
                    type: 'line',
                    symbol: 'none',
                    data: [
                      { x: 0, y: 95 },
                      { x: 10, y: 5 }
                    ]
                  }
                ],
                marks: [
                  {
                    id: 'late-mark',
                    type: 'event',
                    x: 5,
                    y: 10,
                    label: '第二页标记'
                  }
                ]
              },
              'fragment-line-chart'
            )
          ]
        },
        { isSetCursor: true }
      )
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draw = (editor as any).draw
      const fragmentPositionList = findChartGraphicPositionList(
        editor,
        'fragment-line-chart'
      )
      expect(draw.getPageRowList().length).to.be.greaterThan(1)
      expect(fragmentPositionList.length).to.be.greaterThan(1)
      expect(
        new Set(fragmentPositionList.map(position => position.pageNo)).size
      ).to.be.greaterThan(1)
      expect(
        fragmentPositionList.every(position => position.element?.id === 'fragment-line-chart')
      ).to.eq(true)
      expect(
        fragmentPositionList.every(position => !!position.element?.chartGraphicFragment)
      ).to.eq(true)

      const fullLocalX = 160
      const fullLocalY = 1432
      const secondFragment = fragmentPositionList.find(position => {
        const fragment = position.element?.chartGraphicFragment
        return (
          !!fragment &&
          fullLocalY >= fragment.offsetY &&
          fullLocalY <= fragment.offsetY + fragment.fragmentHeight
        )
      })
      expect(secondFragment).to.exist
      expect(secondFragment?.pageNo).to.be.greaterThan(0)
      const fragment = secondFragment?.element?.chartGraphicFragment
      const fragmentLocalY = fullLocalY - (fragment?.offsetY || 0)
      const hit = editor.command.getChartGraphicHit({
        pageNo: secondFragment!.pageNo,
        x: secondFragment!.coordinate.leftTop[0] + fullLocalX,
        y: secondFragment!.coordinate.leftTop[1] + fragmentLocalY
      })
      expect(hit?.pageNo).to.eq(secondFragment!.pageNo)
      expect(hit?.elementId).to.eq('fragment-line-chart')
      expect(hit?.localY).to.be.closeTo(fullLocalY, 1)
      expect(hit?.hit).to.deep.include({
        target: 'mark',
        markId: 'late-mark'
      })

      const fragmentSvg = createPrintSvgChartGraphic(secondFragment as any)
      expect(fragmentSvg).to.contain('clipPath')
      expect(fragmentSvg).to.contain('data-chart-graphic="line"')
      expect(fragmentSvg).to.contain(`translate(0 -${fragment?.offsetY})`)

      const workerCommandList: any[] = []
      pushChartGraphicWorkerSnapshotCommands({
        commandList: workerCommandList,
        element: secondFragment!.element,
        rowPosition: secondFragment!,
        alpha: 1,
        scale: draw.getRuntime().getOptions().scale
      })
      expect(workerCommandList[0]).to.deep.include({
        type: 'pushClipRect'
      })
      expect(workerCommandList[0].rect.height).to.eq(
        secondFragment!.metrics.height
      )
      expect(
        workerCommandList.some(
          command =>
            command.translateY ===
            secondFragment!.coordinate.leftTop[1] - (fragment?.offsetY || 0)
        )
      ).to.eq(true)
      expect(workerCommandList[workerCommandList.length - 1]).to.deep.include({
        type: 'popState'
      })
    })
  })

  it('continues medical charts by time window with repeated headers and event tracks', () => {
    cy.getEditor().then((editor: Editor) => {
      const temperatureData = Array.from({ length: 21 }, (_, index) => ({
        x: index + 1,
        y: 36 + (index % 5) * 0.2,
        label: `day-${index + 1}`
      }))
      editor.command.executeSetValue(
        {
          main: [
            createChartGraphicElement(
              {
                kind: 'vital-signs',
                presetId: 'medical.vitalSigns.standard',
                title: '21日体温单',
                size: { width: 420, height: 260 },
                coordinate: {
                  xAxis: {
                    type: 'linear',
                    min: 1,
                    max: 21,
                    tickInterval: 1
                  },
                  yAxis: {
                    type: 'linear',
                    min: 34,
                    max: 42,
                    tickInterval: 1
                  },
                  padding: {
                    top: 62,
                    right: 20,
                    bottom: 54,
                    left: 42
                  }
                },
                series: [
                  {
                    id: 'temperature',
                    name: '体温',
                    type: 'line',
                    symbol: 'circle',
                    data: temperatureData
                  }
                ],
                marks: [
                  {
                    id: 'operation',
                    type: 'event',
                    x: 10,
                    y: 42,
                    label: '手术'
                  }
                ]
              },
              'medical-window-chart'
            )
          ]
        },
        { isSetCursor: true }
      )
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draw = (editor as any).draw
      const fragmentPositionList = findChartGraphicPositionList(
        editor,
        'medical-window-chart'
      )
      expect(fragmentPositionList).to.have.length(3)
      expect(
        new Set(fragmentPositionList.map(position => position.pageNo)).size
      ).to.eq(3)
      expect(
        fragmentPositionList.map(
          position => position.element?.chartGraphicFragment?.mode
        )
      ).to.deep.eq(['time-window', 'time-window', 'time-window'])
      expect(
        fragmentPositionList.map(position => [
          position.element?.chartGraphicFragment?.xMin,
          position.element?.chartGraphicFragment?.xMax
        ])
      ).to.deep.eq([
        [1, 8],
        [8, 15],
        [15, 21]
      ])
      expect(
        fragmentPositionList.every(
          position =>
            position.element?.chartGraphicFragment?.repeatedHeader === true
        )
      ).to.eq(true)

      const secondPosition = fragmentPositionList[1]
      const secondFragment = secondPosition.element?.chartGraphicFragment
      const sourceChart = secondPosition.element?.chartGraphic
      expect(secondFragment).to.exist
      expect(sourceChart).to.exist
      const windowChart = resolveChartGraphicFragmentChart(
        sourceChart!,
        secondFragment
      )
      expect(windowChart.coordinate?.xAxis).to.include({
        min: 8,
        max: 15
      })
      expect(windowChart.marks?.map(mark => mark.id)).to.deep.eq(['operation'])

      const context = resolveChartRenderContext(
        windowChart,
        secondFragment!.fullWidth,
        secondFragment!.fullHeight
      )
      const eventPoint = resolveChartMedicalMarkCoordinate(
        windowChart,
        windowChart.marks![0],
        context
      )
      expect(eventPoint).to.exist
      const hit = editor.command.getChartGraphicHit({
        pageNo: secondPosition.pageNo,
        x: secondPosition.coordinate.leftTop[0] + eventPoint!.x,
        y: secondPosition.coordinate.leftTop[1] + eventPoint!.y
      })
      expect(hit?.hit).to.deep.include({
        target: 'mark',
        markId: 'operation'
      })

      const secondWindowPoint = resolveChartPointCoordinate(
        resolveChartSeriesDataPoints(
          windowChart.series![0],
          windowChart.coordinate?.xAxis
        )[10],
        context
      )
      const pointHit = editor.command.getChartGraphicHit({
        pageNo: secondPosition.pageNo,
        x: secondPosition.coordinate.leftTop[0] + secondWindowPoint.x,
        y: secondPosition.coordinate.leftTop[1] + secondWindowPoint.y
      })
      expect(pointHit?.hit).to.deep.include({
        target: 'series-point',
        seriesId: 'temperature',
        dataIndex: 10
      })
      expect(
        editor.command.executeUpdateChartGraphicSeriesPoint(
          'medical-window-chart',
          'temperature',
          pointHit!.hit.dataIndex!,
          { y: 39.5 }
        )
      ).to.eq(true)
      expect(
        (
          editor.command.getChartGraphic('medical-window-chart')?.series?.[0]
            .data[10] as { y: number }
        ).y
      ).to.eq(39.5)

      const fragmentSvg = createPrintSvgChartGraphic(secondPosition as any)
      expect(fragmentSvg).to.contain('21日体温单  8-15 日')
      expect(fragmentSvg).to.contain('护理事件')
      expect(fragmentSvg).not.to.contain('clipPath')
      expect(fragmentSvg).not.to.contain('translate(0 -')

      const workerCommandList: any[] = []
      pushChartGraphicWorkerSnapshotCommands({
        commandList: workerCommandList,
        element: secondPosition.element,
        rowPosition: secondPosition,
        alpha: 1,
        scale: draw.getRuntime().getOptions().scale
      })
      expect(
        workerCommandList.some(
          command =>
            command.type === 'fillText' &&
            command.text === '21日体温单  8-15 日'
        )
      ).to.eq(true)
      expect(
        workerCommandList.some(command => command.type === 'pushClipRect')
      ).to.eq(false)
    })
  })

  it('renders chart graphics through offscreen worker without fallback', () => {
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.renderBackend.offscreenCanvas.nonCurrentPageBase = true
      editor.command.executeSetValue(
        {
          main: [
            { value: 'worker chart graphics\n' },
            createChartGraphicElement(
              {
                kind: 'partogram',
                presetId: 'medical.partogram.standard',
                title: 'Worker Partogram'
              },
              'worker-partogram-chart'
            ),
            { value: '\n' },
            createChartGraphicElement(
              {
                kind: 'dental',
                presetId: 'medical.dental.fdi',
                title: 'Worker Dental'
              },
              'worker-dental-chart'
            ),
            { value: '\n' },
            ...Array.from({ length: 180 }, (_, index) => ({
              value: `worker chart page filler ${index}\n`
            }))
          ]
        },
        { isSetCursor: true }
      )
    })
    cy.wait(500)
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      expect(draw.getPageRowList().length).to.be.greaterThan(1)
      draw.setPageNo(1)
      draw.getRange().setRange(-1, -1)
      draw.getCoordinate().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      draw.getServices().workerRenderScheduler.dispose()
      ;(editor as any).resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([0])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })
    cy.getEditor().then((editor: Editor) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = (editor as any).getRenderBackendStats()
        expect(stats.workerRender.submitCount, 'chart worker submit').to.be.greaterThan(0)
        expect(
          stats.workerRender.failoverCount,
          `chart worker failover: ${stats.workerRender.lastFailoverReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, 'chart worker success').to.be.greaterThan(0)
        expect(
          stats.surface.bitmapCache.setCountBySource['worker-render'],
          'chart worker bitmap cache writes'
        ).to.be.greaterThan(0)
        expect(
          stats.workerRender.pendingCount +
            stats.workerRender.activeCount +
            stats.workerRender.queuedCount,
          'chart worker queue drained'
        ).to.eq(0)
      })
    })
  })
})
