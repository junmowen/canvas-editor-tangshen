import {
  ChartGraphicPresetUnregister,
  ChartGraphicKind,
  IChartGraphic,
  IChartGraphicPresetCompatibilityHost,
  IChartGraphicPresetCompatibilityResult,
  IChartGraphicPresetUpgradeInfo,
  IChartGraphicPreset,
  IDentalChartModel
} from '../model/ChartGraphic'
import { deepClone } from '../../../../utils'

const DEFAULT_PALETTE = ['#2563eb', '#dc2626', '#16a34a', '#9333ea']
const ECG_LEAD_NAME_LIST = [
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
]

function createEcgDemoWaveform(leadIndex: number) {
  const phase = leadIndex * 0.38
  const amplitude = 0.72 + (leadIndex % 4) * 0.08
  return Array.from({ length: 500 }, (_, index) => {
    const cycle = index % 48
    if (cycle === 8) return -0.08 * amplitude
    if (cycle === 10) return 0.12 * amplitude
    if (cycle === 17) return -0.16 * amplitude
    if (cycle === 18) return 0.92 * amplitude
    if (cycle === 19) return -0.28 * amplitude
    if (cycle >= 29 && cycle <= 35) {
      return Math.sin(((cycle - 29) / 6) * Math.PI) * 0.24 * amplitude
    }
    return Math.sin(index / 18 + phase) * 0.025
  })
}

/** 默认折线图预设，作为图表模块最小可用能力。 */
export const BASIC_LINE_CHART_PRESET: IChartGraphicPreset = {
  id: 'common.line.basic',
  kind: 'line',
  name: '基础折线图',
  version: '1.0.0',
  defaultSize: {
    width: 520,
    height: 260
  },
  defaultCoordinate: {
    xAxis: {
      type: 'linear'
    },
    yAxis: {
      type: 'linear'
    },
    grid: {
      majorStep: 1
    },
    padding: {
      top: 24,
      right: 24,
      bottom: 36,
      left: 44
    }
  },
  defaultSeries: [
    {
      id: 'series-1',
      name: '趋势',
      type: 'line',
      symbol: 'circle',
      data: [
        { x: 1, y: 3 },
        { x: 2, y: 4 },
        { x: 3, y: 2 },
        { x: 4, y: 6 },
        { x: 5, y: 5 }
      ]
    }
  ],
  defaultTheme: {
    palette: DEFAULT_PALETTE,
    textColor: '#1f2937',
    gridColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'Microsoft YaHei, Arial, sans-serif'
  }
}

/** 默认柱状图预设，覆盖分类轴和分组柱语义。 */
export const BASIC_BAR_CHART_PRESET: IChartGraphicPreset = {
  id: 'common.bar.basic',
  kind: 'line',
  name: '基础柱状图',
  version: '1.0.0',
  defaultSize: {
    width: 560,
    height: 280
  },
  defaultCoordinate: {
    xAxis: {
      type: 'category',
      categories: ['一月', '二月', '三月', '四月']
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: 100,
      tickInterval: 20
    },
    grid: {
      majorStep: 1
    },
    padding: {
      top: 24,
      right: 24,
      bottom: 36,
      left: 44
    }
  },
  defaultSeries: [
    {
      id: 'outpatient',
      name: '门诊',
      type: 'bar',
      color: '#2563eb',
      data: [
        { x: '一月', y: 32 },
        { x: '二月', y: 48 },
        { x: '三月', y: 56 },
        { x: '四月', y: 44 }
      ]
    },
    {
      id: 'emergency',
      name: '急诊',
      type: 'bar',
      color: '#dc2626',
      data: [
        { x: '一月', y: 18 },
        { x: '二月', y: 26 },
        { x: '三月', y: 34 },
        { x: '四月', y: 30 }
      ]
    }
  ],
  defaultTheme: {
    palette: DEFAULT_PALETTE,
    textColor: '#1f2937',
    gridColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'Microsoft YaHei, Arial, sans-serif'
  }
}

const VITAL_SIGNS_PRESET: IChartGraphicPreset = {
  id: 'medical.vitalSigns.standard',
  kind: 'vital-signs',
  name: '标准体温单',
  version: '1.0.0',
  defaultSize: {
    width: 720,
    height: 420
  },
  defaultCoordinate: {
    xAxis: {
      type: 'linear',
      min: 1,
      max: 7
    },
    yAxis: {
      type: 'linear',
      min: 34,
      max: 42
    },
    padding: {
      top: 62,
      right: 28,
      bottom: 54,
      left: 48
    }
  },
  defaultSeries: [
    {
      id: 'temperature',
      name: '体温',
      type: 'line',
      unit: 'celsius',
      symbol: 'circle',
      color: '#2563eb',
      data: [
        { x: 1, y: 36.5 },
        { x: 2, y: 36.8 },
        { x: 3, y: 37.2 },
        { x: 4, y: 36.9 },
        { x: 5, y: 37.4 },
        { x: 6, y: 37.1 },
        { x: 7, y: 36.7 }
      ]
    },
    {
      id: 'pulse',
      name: '脉搏',
      type: 'line',
      unit: 'bpm',
      symbol: 'dot',
      color: '#dc2626',
      data: [
        { x: 1, y: 36.9 },
        { x: 2, y: 37.2 },
        { x: 3, y: 37.8 },
        { x: 4, y: 37.4 },
        { x: 5, y: 38.1 },
        { x: 6, y: 37.6 },
        { x: 7, y: 37.1 }
      ]
    },
    {
      id: 'respiration',
      name: '呼吸',
      type: 'scatter',
      unit: 'rpm',
      symbol: 'triangle',
      color: '#16a34a',
      data: [
        { x: 1, y: 35.8 },
        { x: 2, y: 36 },
        { x: 3, y: 36.2 },
        { x: 4, y: 35.9 },
        { x: 5, y: 36.3 },
        { x: 6, y: 36.1 },
        { x: 7, y: 35.9 }
      ]
    }
  ],
  defaultMarks: [
    {
      id: 'admission',
      type: 'event',
      x: 1,
      y: 42,
      label: '入院'
    }
  ],
  defaultTheme: {
    palette: ['#2563eb', '#dc2626'],
    textColor: '#1f2937',
    gridColor: '#dbeafe',
    backgroundColor: '#ffffff'
  },
  defaultPagination: {
    mode: 'time-window',
    windowSize: 7,
    pageBreakBetweenFragments: true,
    repeatedHeaderHeight: 34,
    eventTrackHeight: 20
  }
}

const ECG_PRESET: IChartGraphicPreset = {
  id: 'medical.ecg.standard',
  kind: 'ecg',
  name: '心电图',
  version: '1.0.0',
  defaultSize: {
    width: 760,
    height: 420,
    lockAspectRatio: true
  },
  defaultCoordinate: {
    xAxis: {
      type: 'linear',
      min: 0,
      max: 499
    },
    yAxis: {
      type: 'linear',
      min: -1.6,
      max: 1.6
    },
    grid: {
      majorStep: 5,
      minorStep: 1,
      paperSpeed: 25,
      gain: 10
    },
    padding: {
      top: 34,
      right: 18,
      bottom: 24,
      left: 24
    }
  },
  defaultSeries: ECG_LEAD_NAME_LIST.map((leadName, leadIndex) => ({
      id: `lead-${leadName}`,
      name: leadName,
      type: 'waveform',
      sampleRate: 500,
      symbol: 'none',
      color: '#111827',
      data: createEcgDemoWaveform(leadIndex)
    })),
  defaultTheme: {
    palette: ['#111827'],
    textColor: '#1f2937',
    gridColor: '#fecaca',
    backgroundColor: '#fffafa'
  }
}

const MENSTRUAL_PRESET: IChartGraphicPreset = {
  id: 'medical.menstrual.standard',
  kind: 'menstrual',
  name: '月经图',
  version: '1.0.0',
  defaultSize: {
    width: 640,
    height: 320
  },
  defaultCoordinate: {
    xAxis: {
      type: 'linear',
      min: 1,
      max: 28
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: 4
    },
    padding: {
      top: 32,
      right: 28,
      bottom: 40,
      left: 48
    }
  },
  defaultSeries: [
    {
      id: 'flow',
      name: '经量',
      type: 'stepLine',
      unit: 'level',
      symbol: 'circle',
      color: '#dc2626',
      data: [
        { x: 1, y: 0 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 2 },
        { x: 5, y: 1 },
        { x: 6, y: 0 },
        { x: 14, y: 1 },
        { x: 28, y: 0 }
      ]
    }
  ],
  defaultMarks: [
    {
      id: 'ovulation',
      type: 'event',
      x: 14,
      y: 1,
      label: '排卵'
    }
  ],
  defaultRegions: [
    {
      id: 'menstruation',
      type: 'range',
      xStart: 2,
      xEnd: 6,
      yStart: 0,
      yEnd: 4,
      label: '经期',
      color: '#fecdd3'
    }
  ],
  defaultTheme: {
    palette: ['#dc2626', '#9333ea'],
    textColor: '#1f2937',
    gridColor: '#fbcfe8',
    backgroundColor: '#fff7fb'
  }
}

const PARTOGRAM_PRESET: IChartGraphicPreset = {
  id: 'medical.partogram.standard',
  kind: 'partogram',
  name: '产程图',
  version: '1.0.0',
  defaultSize: {
    width: 720,
    height: 420
  },
  defaultCoordinate: {
    xAxis: {
      type: 'linear',
      min: 0,
      max: 12
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: 10
    },
    padding: {
      top: 32,
      right: 32,
      bottom: 42,
      left: 48
    }
  },
  defaultSeries: [
    {
      id: 'cervix',
      name: '宫口扩张',
      type: 'line',
      unit: 'cm',
      symbol: 'circle',
      color: '#2563eb',
      data: [
        { x: 0, y: 2 },
        { x: 2, y: 3 },
        { x: 4, y: 4 },
        { x: 6, y: 6 },
        { x: 8, y: 8 },
        { x: 10, y: 10 }
      ]
    },
    {
      id: 'alert-line',
      name: '警戒线',
      type: 'line',
      symbol: 'none',
      color: '#f97316',
      data: [
        { x: 4, y: 4 },
        { x: 10, y: 10 }
      ]
    },
    {
      id: 'action-line',
      name: '处理线',
      type: 'line',
      symbol: 'none',
      color: '#dc2626',
      data: [
        { x: 8, y: 4 },
        { x: 12, y: 8 }
      ]
    },
    {
      id: 'station',
      name: '胎头下降',
      type: 'line',
      symbol: 'square',
      color: '#16a34a',
      data: [
        { x: 0, y: 8 },
        { x: 2, y: 7 },
        { x: 4, y: 6 },
        { x: 6, y: 4 },
        { x: 8, y: 2 },
        { x: 10, y: 1 }
      ]
    }
  ],
  defaultMarks: [
    {
      id: 'rupture-of-membranes',
      type: 'event',
      x: 3,
      y: 3.5,
      label: '破膜'
    }
  ],
  defaultRegions: [
    {
      id: 'active-phase',
      type: 'phase',
      xStart: 4,
      xEnd: 10,
      yStart: 0,
      yEnd: 10,
      label: '活跃期',
      color: '#dbeafe'
    }
  ],
  defaultTheme: {
    palette: ['#2563eb', '#16a34a', '#dc2626'],
    textColor: '#1f2937',
    gridColor: '#dbeafe',
    backgroundColor: '#ffffff'
  },
  defaultInteraction: {
    coordinateLocked: true
  }
}

const ANESTHESIA_PRESET: IChartGraphicPreset = {
  id: 'medical.anesthesia.standard',
  kind: 'anesthesia',
  name: '麻醉记录曲线图',
  version: '1.0.0',
  defaultSize: {
    width: 720,
    height: 360
  },
  defaultCoordinate: {
    xAxis: {
      type: 'linear',
      min: 0,
      max: 120
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: 220
    },
    padding: {
      top: 58,
      right: 28,
      bottom: 58,
      left: 48
    }
  },
  defaultSeries: [
    {
      id: 'hr',
      name: '心率',
      type: 'line',
      unit: 'bpm',
      symbol: 'circle',
      color: '#dc2626',
      data: [
        { x: 0, y: 82 },
        { x: 20, y: 86 },
        { x: 40, y: 91 },
        { x: 60, y: 88 },
        { x: 80, y: 84 },
        { x: 100, y: 90 },
        { x: 120, y: 86 }
      ]
    },
    {
      id: 'sbp',
      name: '收缩压',
      type: 'line',
      unit: 'mmHg',
      symbol: 'square',
      color: '#2563eb',
      data: [
        { x: 0, y: 128 },
        { x: 20, y: 122 },
        { x: 40, y: 118 },
        { x: 60, y: 126 },
        { x: 80, y: 132 },
        { x: 100, y: 124 },
        { x: 120, y: 120 }
      ]
    }
  ],
  defaultMarks: [
    {
      id: 'induction',
      type: 'medication',
      x: 10,
      y: 210,
      label: '诱导'
    },
    {
      id: 'incision',
      type: 'event',
      x: 30,
      y: 210,
      label: '切皮'
    }
  ],
  defaultTheme: {
    palette: ['#dc2626', '#2563eb'],
    textColor: '#1f2937',
    gridColor: '#e5e7eb',
    backgroundColor: '#ffffff'
  },
  defaultPagination: {
    mode: 'time-window',
    windowSize: 60,
    pageBreakBetweenFragments: true,
    repeatedHeaderHeight: 30,
    eventTrackHeight: 22
  }
}

function createDefaultDentalModel(): IDentalChartModel {
  return {
    notation: 'FDI',
    dentition: 'permanent',
    teeth: [
      ...['18', '17', '16', '15', '14', '13', '12', '11'],
      ...['21', '22', '23', '24', '25', '26', '27', '28'],
      ...['48', '47', '46', '45', '44', '43', '42', '41'],
      ...['31', '32', '33', '34', '35', '36', '37', '38']
    ].map(code => ({ code }))
  }
}

const DENTAL_PRESET: IChartGraphicPreset = {
  id: 'medical.dental.fdi',
  kind: 'dental',
  name: 'FDI 牙位图',
  version: '1.0.0',
  defaultSize: {
    width: 560,
    height: 300
  },
  defaultTheme: {
    palette: ['#2563eb', '#dc2626', '#16a34a'],
    textColor: '#1f2937',
    gridColor: '#d1d5db',
    backgroundColor: '#ffffff'
  }
}

const BUILTIN_PRESET_LIST: IChartGraphicPreset[] = [
  BASIC_LINE_CHART_PRESET,
  BASIC_BAR_CHART_PRESET,
  VITAL_SIGNS_PRESET,
  ECG_PRESET,
  MENSTRUAL_PRESET,
  PARTOGRAM_PRESET,
  DENTAL_PRESET,
  ANESTHESIA_PRESET
]

const chartGraphicPresetOrder = BUILTIN_PRESET_LIST.map(preset => preset.id)

const chartGraphicPresetStackMap = new Map<string, IChartGraphicPreset[]>(
  BUILTIN_PRESET_LIST.map(preset => [preset.id, [preset]])
)

const DEFAULT_HOST_FEATURE_LIST = [
  'chart-graphic',
  'canvas-render',
  'svg-export',
  'worker-snapshot',
  'data-binding',
  'internal-editing',
  'clipboard-fallback',
  'business-validation'
]

function resolveActiveChartGraphicPresetById(presetId: string) {
  const presetStack = chartGraphicPresetStackMap.get(presetId)
  return presetStack?.[presetStack.length - 1] || null
}

function parseVersion(value: string | undefined) {
  return String(value || '')
    .split('.')
    .map(part => Number.parseInt(part, 10))
    .map(part => (Number.isFinite(part) ? part : 0))
}

export function compareChartGraphicPresetVersion(
  left: string | undefined,
  right: string | undefined
) {
  const leftList = parseVersion(left)
  const rightList = parseVersion(right)
  const length = Math.max(leftList.length, rightList.length, 3)
  for (let index = 0; index < length; index++) {
    const leftPart = leftList[index] || 0
    const rightPart = rightList[index] || 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }
  return 0
}

const compareVersion = compareChartGraphicPresetVersion

function isValidChartGraphicPreset(preset: IChartGraphicPreset) {
  return (
    !!preset.id?.trim() &&
    !!preset.name?.trim() &&
    !!preset.version?.trim() &&
    Number.isFinite(preset.defaultSize?.width) &&
    preset.defaultSize.width > 0 &&
    Number.isFinite(preset.defaultSize?.height) &&
    preset.defaultSize.height > 0
  )
}

/** 读取当前生效的图表预设列表，可按 kind 过滤。 */
export function getChartGraphicPresetList(kind?: ChartGraphicKind) {
  const presetList = chartGraphicPresetOrder
    .map(resolveActiveChartGraphicPresetById)
    .filter((preset): preset is IChartGraphicPreset => !!preset)
  return kind ? presetList.filter(preset => preset.kind === kind) : presetList
}

/** 注册图表预设；同 id 重复注册时临时覆盖当前预设，取消注册后恢复上一个版本。 */
export function registerChartGraphicPreset(
  preset: IChartGraphicPreset
): ChartGraphicPresetUnregister {
  if (!isValidChartGraphicPreset(preset)) return () => undefined
  const registeredPreset = deepClone(preset)
  const presetStack = chartGraphicPresetStackMap.get(registeredPreset.id)
  if (presetStack) {
    presetStack.push(registeredPreset)
  } else {
    chartGraphicPresetStackMap.set(registeredPreset.id, [registeredPreset])
    chartGraphicPresetOrder.push(registeredPreset.id)
  }
  let isUnregistered = false
  return () => {
    if (isUnregistered) return
    isUnregistered = true
    const entries = chartGraphicPresetStackMap.get(registeredPreset.id)
    if (!entries?.length) return
    const entryIndex = entries.lastIndexOf(registeredPreset)
    if (entryIndex < 0) return
    entries.splice(entryIndex, 1)
    if (entries.length) return
    chartGraphicPresetStackMap.delete(registeredPreset.id)
    const orderIndex = chartGraphicPresetOrder.lastIndexOf(registeredPreset.id)
    if (orderIndex >= 0) {
      chartGraphicPresetOrder.splice(orderIndex, 1)
    }
  }
}

/** 查询预设与宿主版本 / 能力的兼容性。 */
export function getChartGraphicPresetCompatibility(
  presetId: string,
  host: IChartGraphicPresetCompatibilityHost = {}
): IChartGraphicPresetCompatibilityResult {
  const preset = findChartGraphicPresetById(presetId)
  if (!preset) {
    return {
      compatible: false,
      presetFound: false,
      presetId,
      warnings: ['chart.preset.missing']
    }
  }
  const hostVersion = host.version || '0.0.0'
  const hostFeatureSet = new Set([
    ...DEFAULT_HOST_FEATURE_LIST,
    ...(host.features || [])
  ])
  const warnings: string[] = []
  const compatibility = preset.compatibility
  if (
    compatibility?.minHostVersion &&
    compareVersion(hostVersion, compatibility.minHostVersion) < 0
  ) {
    warnings.push('chart.preset.hostVersionTooLow')
  }
  if (
    compatibility?.maxHostVersion &&
    compareVersion(hostVersion, compatibility.maxHostVersion) > 0
  ) {
    warnings.push('chart.preset.hostVersionTooHigh')
  }
  const missingFeatureList = (compatibility?.requiredFeatures || []).filter(
    feature => !hostFeatureSet.has(feature)
  )
  if (missingFeatureList.length) {
    warnings.push('chart.preset.requiredFeatureMissing')
  }
  return {
    compatible: warnings.length === 0,
    presetFound: true,
    presetId: preset.id,
    presetVersion: preset.version,
    warnings: warnings.length ? warnings : undefined
  }
}

/** 查询图表实例是否落后于当前注册表中的同 id 预设版本。 */
export function getChartGraphicPresetUpgradeInfo(
  chart: IChartGraphic | null | undefined
): IChartGraphicPresetUpgradeInfo {
  const presetId = chart?.presetId
  if (!chart || !presetId) {
    return {
      upgradable: false,
      presetFound: false,
      kindMatched: false,
      warnings: ['chart.preset.missing']
    }
  }
  const preset = findChartGraphicPresetById(presetId)
  if (!preset) {
    return {
      upgradable: false,
      presetFound: false,
      kindMatched: false,
      presetId,
      currentVersion: chart.presetVersion,
      warnings: ['chart.preset.missing']
    }
  }
  const currentVersion = chart.presetVersion || preset.version
  const versionCompare = compareVersion(currentVersion, preset.version)
  const warnings: string[] = []
  if (preset.kind !== chart.kind) {
    warnings.push('chart.preset.kindMismatch')
  } else if (versionCompare > 0) {
    warnings.push('chart.preset.versionAhead')
  } else if (versionCompare === 0) {
    warnings.push('chart.preset.alreadyLatest')
  }
  return {
    upgradable: preset.kind === chart.kind && versionCompare < 0,
    presetFound: true,
    kindMatched: preset.kind === chart.kind,
    presetId: preset.id,
    currentVersion,
    latestVersion: preset.version,
    warnings: warnings.length ? warnings : undefined
  }
}

/** 创建保守升级 patch：只吸收预设治理默认值，不覆盖业务曲线、牙位和标注数据。 */
export function createChartGraphicPresetUpgradePatch(
  chart: IChartGraphic | null | undefined
): Partial<IChartGraphic> | null {
  const info = getChartGraphicPresetUpgradeInfo(chart)
  if (!chart || !info.upgradable || !info.presetId) return null
  const preset = findChartGraphicPresetById(info.presetId)
  if (!preset) return null
  return {
    presetVersion: preset.version,
    source:
      chart.source || preset.defaultSource
        ? {
            ...(preset.defaultSource || chart.source!),
            ...chart.source,
            fieldMap: {
              ...preset.defaultSource?.fieldMap,
              ...chart.source?.fieldMap
            },
            fieldTransforms: {
              ...preset.defaultSource?.fieldTransforms,
              ...chart.source?.fieldTransforms
            }
          }
        : undefined,
    theme: {
      ...preset.defaultTheme,
      ...chart.theme,
      palette:
        chart.theme?.palette ||
        preset.defaultTheme?.palette ||
        DEFAULT_PALETTE
    },
    interaction: {
      ...preset.defaultInteraction,
      ...chart.interaction
    },
    pagination:
      chart.pagination || preset.defaultPagination
        ? {
            ...(preset.defaultPagination || chart.pagination!),
            ...chart.pagination
          }
        : undefined
  }
}

/** 按 presetId 精确查找预设。 */
export function findChartGraphicPresetById(presetId: string) {
  return resolveActiveChartGraphicPresetById(presetId)
}

/** 按 kind 和 presetId 解析预设。 */
export function resolveChartGraphicPreset(
  kind: ChartGraphicKind,
  presetId?: string
) {
  const preset = findChartGraphicPresetById(presetId || '')
  return (
    (preset?.kind === kind ? preset : null) ||
    getChartGraphicPresetList(kind)[0] ||
    BASIC_LINE_CHART_PRESET
  )
}

/** 合并预设默认值和用户输入。 */
export function normalizeChartGraphic(chart: Partial<IChartGraphic> & {
  kind: ChartGraphicKind
  width?: number
  height?: number
}): IChartGraphic {
  const preset = resolveChartGraphicPreset(chart.kind, chart.presetId)
  return deepClone({
    version: 1,
    kind: chart.kind,
    presetId: preset.id,
    presetVersion: chart.presetVersion || preset.version,
    title: chart.title || preset.name,
    size: {
      ...preset.defaultSize,
      ...chart.size,
      width: chart.width || chart.size?.width || preset.defaultSize.width,
      height: chart.height || chart.size?.height || preset.defaultSize.height
    },
    coordinate: {
      ...preset.defaultCoordinate,
      ...chart.coordinate,
      padding: {
        ...preset.defaultCoordinate?.padding,
        ...chart.coordinate?.padding
      }
    },
    series: chart.series || preset.defaultSeries,
    marks: chart.marks || preset.defaultMarks,
    regions: chart.regions || preset.defaultRegions,
    annotations: chart.annotations,
    dental:
      chart.dental ||
      (chart.kind === 'dental' ? createDefaultDentalModel() : undefined),
    source:
      chart.source || preset.defaultSource
        ? {
            ...(preset.defaultSource || chart.source!),
            ...chart.source,
            fieldMap: {
              ...preset.defaultSource?.fieldMap,
              ...chart.source?.fieldMap
            },
            fieldTransforms: {
              ...preset.defaultSource?.fieldTransforms,
              ...chart.source?.fieldTransforms
            }
          }
        : undefined,
    theme: {
      ...preset.defaultTheme,
      ...chart.theme,
      palette: chart.theme?.palette || preset.defaultTheme?.palette || DEFAULT_PALETTE
    },
    interaction: {
      ...preset.defaultInteraction,
      ...chart.interaction
    },
    fallback: chart.fallback,
    pagination:
      chart.pagination || preset.defaultPagination
        ? {
            ...(preset.defaultPagination || chart.pagination!),
            ...chart.pagination
          }
        : undefined
  })
}
