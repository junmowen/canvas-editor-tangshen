import {
  ChartGraphicKind,
  DentalSurface,
  DentalToothStatus,
  IChartGraphic,
  IChartGraphicValidationIssue,
  IChartGraphicValidationResult,
  IChartSeries
} from '../../../../interface/ChartGraphic'
import {
  resolveChartSeriesDataPoints,
  toChartNumber
} from '../render/ChartGraphicSeriesPointPolicy'
import {
  findChartGraphicPresetById,
  getChartGraphicPresetUpgradeInfo
} from './ChartGraphicPreset'

const CHART_KIND_SET = new Set<ChartGraphicKind>([
  'vital-signs',
  'ecg',
  'menstrual',
  'partogram',
  'line',
  'dental',
  'anesthesia',
  'custom'
])

const SERIES_TYPE_SET = new Set<IChartSeries['type']>([
  'line',
  'smoothLine',
  'stepLine',
  'waveform',
  'scatter',
  'bar'
])

const DENTAL_STATUS_SET = new Set<DentalToothStatus>([
  'missing',
  'caries',
  'filled',
  'rootCanal',
  'crown',
  'implant'
])

const DENTAL_SURFACE_SET = new Set<DentalSurface>([
  'mesial',
  'distal',
  'buccal',
  'lingual',
  'occlusal'
])

const FDI_PERMANENT_TOOTH_CODE_SET = new Set([
  '18',
  '17',
  '16',
  '15',
  '14',
  '13',
  '12',
  '11',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '48',
  '47',
  '46',
  '45',
  '44',
  '43',
  '42',
  '41',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38'
])

const SERIES_POINT_COUNT_WARNING_THRESHOLD = 30000
const TOTAL_POINT_COUNT_WARNING_THRESHOLD = 80000
const RENDER_AREA_WARNING_THRESHOLD = 2000000
const TIME_WINDOW_FRAGMENT_COUNT_WARNING_THRESHOLD = 24
const VERTICAL_SLICE_HEIGHT_WARNING_THRESHOLD = 6000

function isPositiveFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function pushIssue(
  list: IChartGraphicValidationIssue[],
  issue: IChartGraphicValidationIssue
) {
  list.push(issue)
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(
        key =>
          `${key}:${stableStringify((value as Record<string, unknown>)[key])}`
      )
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function isSamePlainValue(left: unknown, right: unknown) {
  return stableStringify(left) === stableStringify(right)
}

function getChartBusinessRange(chart: IChartGraphic, series: Partial<IChartSeries>) {
  if (chart.kind === 'menstrual' && series.id === 'flow') {
    return { min: 0, max: 4, label: '经量等级' }
  }
  if (chart.kind === 'partogram' && series.id === 'cervix') {
    return { min: 0, max: 10, label: '宫口扩张' }
  }
  if (
    chart.kind === 'vital-signs' &&
    (series.id === 'temperature' || series.unit === 'celsius')
  ) {
    return { min: 34, max: 42, label: '体温' }
  }
  if (chart.kind === 'anesthesia' && series.id === 'hr') {
    return { min: 20, max: 220, label: '心率' }
  }
  if (chart.kind === 'anesthesia' && series.id === 'sbp') {
    return { min: 40, max: 260, label: '收缩压' }
  }
  return null
}

function validateAxisRange(
  errors: IChartGraphicValidationIssue[],
  axis: unknown,
  path: string
) {
  if (!axis || typeof axis !== 'object') return
  const rawAxis = axis as { min?: number | string; max?: number | string }
  if (rawAxis.min === undefined && rawAxis.max === undefined) return
  if (rawAxis.min === undefined || rawAxis.max === undefined) return
  const min = toChartNumber(rawAxis.min, Number.NaN)
  const max = toChartNumber(rawAxis.max, Number.NaN)
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    pushIssue(errors, {
      code: 'chart.axis.rangeInvalid',
      message: '坐标轴最小值或最大值无法转换为有效数值',
      path,
      severity: 'error'
    })
    return
  }
  if (min >= max) {
    pushIssue(errors, {
      code: 'chart.axis.rangeOrderInvalid',
      message: '坐标轴最小值必须小于最大值',
      path,
      severity: 'error'
    })
  }
}

function validateSeriesList(
  errors: IChartGraphicValidationIssue[],
  warnings: IChartGraphicValidationIssue[],
  chart: IChartGraphic,
  seriesList: unknown,
  xAxis?: NonNullable<IChartGraphic['coordinate']>['xAxis']
) {
  if (!Array.isArray(seriesList) || !seriesList.length) {
    pushIssue(warnings, {
      code: 'chart.series.empty',
      message: '非牙位图至少应包含一个数据序列',
      path: 'series',
      severity: 'warning'
    })
    return
  }
  const seriesIdSet = new Set<string>()
  seriesList.forEach((series, index) => {
    const path = `series.${index}`
    if (!series || typeof series !== 'object') {
      pushIssue(errors, {
        code: 'chart.series.invalid',
        message: '序列必须是对象',
        path,
        severity: 'error'
      })
      return
    }
    const current = series as Partial<IChartSeries>
    if (!current.id) {
      pushIssue(errors, {
        code: 'chart.series.idMissing',
        message: '序列 id 必填',
        path: `${path}.id`,
        severity: 'error'
      })
    } else if (seriesIdSet.has(current.id)) {
      pushIssue(errors, {
        code: 'chart.series.idDuplicated',
        message: '序列 id 不能重复',
        path: `${path}.id`,
        severity: 'error'
      })
    } else {
      seriesIdSet.add(current.id)
    }
    if (!current.type || !SERIES_TYPE_SET.has(current.type)) {
      pushIssue(errors, {
        code: 'chart.series.typeUnsupported',
        message: '序列类型不受支持',
        path: `${path}.type`,
        severity: 'error'
      })
    }
    if (!Array.isArray(current.data)) {
      pushIssue(errors, {
        code: 'chart.series.dataInvalid',
        message: '序列 data 必须是数组',
        path: `${path}.data`,
        severity: 'error'
      })
      return
    }
    if (!current.data.length) {
      pushIssue(warnings, {
        code: 'chart.series.dataEmpty',
        message: '序列 data 为空',
        path: `${path}.data`,
        severity: 'warning'
      })
      return
    }
    const pointList = resolveChartSeriesDataPoints(
      current as IChartSeries,
      xAxis
    )
    const invalidPointCount = current.data.length - pointList.length
    if (!pointList.length) {
      pushIssue(errors, {
        code: 'chart.series.pointMissing',
        message: '序列没有可渲染的有效点位',
        path: `${path}.data`,
        severity: 'error'
      })
    } else if (invalidPointCount > 0) {
      pushIssue(warnings, {
        code: 'chart.series.pointFiltered',
        message: `序列存在 ${invalidPointCount} 个无效点位，渲染时会被过滤`,
        path: `${path}.data`,
        severity: 'warning'
      })
    }
    if (
      current.type === 'waveform' &&
      current.data.length > 20000 &&
      !current.sampleRate
    ) {
      pushIssue(warnings, {
        code: 'chart.series.waveformSampleRateMissing',
        message: '高密度波形建议提供 sampleRate，便于数据源和导出链路追踪采样信息',
        path: `${path}.sampleRate`,
        severity: 'warning'
      })
    }
    const businessRange = getChartBusinessRange(chart, current)
    if (businessRange) {
      const outOfRangeCount = pointList.filter(
        point => point.y < businessRange.min || point.y > businessRange.max
      ).length
      if (outOfRangeCount) {
        pushIssue(warnings, {
          code: 'chart.series.businessRangeExceeded',
          message: `${businessRange.label}存在 ${outOfRangeCount} 个超出业务范围的点位`,
          path: `${path}.data`,
          severity: 'warning'
        })
      }
    }
  })
}

function validateDentalModel(
  errors: IChartGraphicValidationIssue[],
  warnings: IChartGraphicValidationIssue[],
  dental: IChartGraphic['dental']
) {
  if (!dental) {
    pushIssue(errors, {
      code: 'chart.dental.missing',
      message: '牙位图缺少 dental 模型',
      path: 'dental',
      severity: 'error'
    })
    return
  }
  if (!Array.isArray(dental.teeth) || !dental.teeth.length) {
    pushIssue(errors, {
      code: 'chart.dental.teethEmpty',
      message: '牙位图 teeth 不能为空',
      path: 'dental.teeth',
      severity: 'error'
    })
    return
  }
  const toothCodeSet = new Set<string>()
  dental.teeth.forEach((tooth, index) => {
    const path = `dental.teeth.${index}`
    if (!tooth.code) {
      pushIssue(errors, {
        code: 'chart.dental.toothCodeMissing',
        message: '牙位编码必填',
        path: `${path}.code`,
        severity: 'error'
      })
      return
    }
    if (toothCodeSet.has(tooth.code)) {
      pushIssue(errors, {
        code: 'chart.dental.toothCodeDuplicated',
        message: '牙位编码不能重复',
        path: `${path}.code`,
        severity: 'error'
      })
    } else {
      toothCodeSet.add(tooth.code)
    }
    if (
      dental.notation === 'FDI' &&
      dental.dentition === 'permanent' &&
      !FDI_PERMANENT_TOOTH_CODE_SET.has(tooth.code)
    ) {
      pushIssue(warnings, {
        code: 'chart.dental.toothCodeUnsupported',
        message: 'FDI 恒牙牙位编码不在标准 32 牙范围内',
        path: `${path}.code`,
        severity: 'warning'
      })
    }
    if (!tooth.status) return
    if (!Array.isArray(tooth.status)) {
      pushIssue(warnings, {
        code: 'chart.dental.statusInvalid',
        message: '牙位状态应为数组',
        path: `${path}.status`,
        severity: 'warning'
      })
      return
    }
    tooth.status.forEach((status, statusIndex) => {
      if (!DENTAL_STATUS_SET.has(status)) {
        pushIssue(warnings, {
          code: 'chart.dental.statusUnsupported',
          message: '牙位状态不受支持',
          path: `${path}.status.${statusIndex}`,
          severity: 'warning'
        })
      }
    })
    const surfaces = tooth.surfaces
    if (!surfaces) return
    Object.entries(surfaces).forEach(([surface, surfaceStatusList]) => {
      if (!DENTAL_SURFACE_SET.has(surface as DentalSurface)) {
        pushIssue(warnings, {
          code: 'chart.dental.surfaceUnsupported',
          message: '牙面类型不受支持',
          path: `${path}.surfaces.${surface}`,
          severity: 'warning'
        })
        return
      }
      if (!Array.isArray(surfaceStatusList)) {
        pushIssue(warnings, {
          code: 'chart.dental.surfaceStatusInvalid',
          message: '牙面状态应为数组',
          path: `${path}.surfaces.${surface}`,
          severity: 'warning'
        })
        return
      }
      surfaceStatusList.forEach((status, statusIndex) => {
        if (!DENTAL_STATUS_SET.has(status)) {
          pushIssue(warnings, {
            code: 'chart.dental.surfaceStatusUnsupported',
            message: '牙面状态不受支持',
            path: `${path}.surfaces.${surface}.${statusIndex}`,
            severity: 'warning'
          })
        }
      })
    })
  })
}

function validateDataSourceBinding(
  warnings: IChartGraphicValidationIssue[],
  chart: IChartGraphic
) {
  const source = chart.source
  if (!source) return
  if (source.lastError) {
    pushIssue(warnings, {
      code: 'chart.source.lastError',
      message: `数据源刷新失败：${source.lastError}`,
      path: 'source.lastError',
      severity: 'warning'
    })
  }
  const fieldMap = source.fieldMap
  if (!fieldMap) return
  if (chart.kind === 'dental') return
  if ((fieldMap.x && !fieldMap.y) || (!fieldMap.x && fieldMap.y)) {
    pushIssue(warnings, {
      code: 'chart.source.fieldMapIncomplete',
      message: '数据源字段映射需要同时提供 x 和 y 才能生成序列',
      path: 'source.fieldMap',
      severity: 'warning'
    })
  }
}

function validatePresetGovernance(
  warnings: IChartGraphicValidationIssue[],
  chart: IChartGraphic
) {
  const info = getChartGraphicPresetUpgradeInfo(chart)
  if (!info.presetFound) {
    pushIssue(warnings, {
      code: 'chart.preset.missing',
      message: '图表引用的预设当前未注册',
      path: 'presetId',
      severity: 'warning'
    })
    return
  }
  if (!info.kindMatched) {
    pushIssue(warnings, {
      code: 'chart.preset.kindMismatch',
      message: '图表类型与当前注册预设类型不一致',
      path: 'kind',
      severity: 'warning'
    })
    return
  }
  if (info.upgradable) {
    pushIssue(warnings, {
      code: 'chart.preset.versionOutdated',
      message: `图表预设版本 ${info.currentVersion || '-'} 落后于当前版本 ${info.latestVersion || '-'}`,
      path: 'presetVersion',
      severity: 'warning'
    })
    return
  }
  if (info.warnings?.includes('chart.preset.versionAhead')) {
    pushIssue(warnings, {
      code: 'chart.preset.versionAhead',
      message: `图表预设版本 ${info.currentVersion || '-'} 高于当前注册版本 ${info.latestVersion || '-'}`,
      path: 'presetVersion',
      severity: 'warning'
    })
  }
  if (!info.presetFound || !info.kindMatched || info.upgradable) return
  const preset = chart.presetId
    ? findChartGraphicPresetById(chart.presetId)
    : null
  if (!preset) return
  if (
    preset.defaultInteraction?.coordinateLocked &&
    chart.interaction?.coordinateLocked &&
    preset.defaultCoordinate &&
    !isSamePlainValue(chart.coordinate, preset.defaultCoordinate)
  ) {
    pushIssue(warnings, {
      code: 'chart.preset.lockedCoordinateChanged',
      message: '图表坐标已偏离锁定预设，建议通过预设升级或 provider 策略确认该改动',
      path: 'coordinate',
      severity: 'warning'
    })
  }
  if (preset.defaultSize.lockAspectRatio) {
    const expectedRatio = preset.defaultSize.width / preset.defaultSize.height
    const currentRatio =
      chart.size && chart.size.height
        ? chart.size.width / chart.size.height
        : expectedRatio
    if (chart.size?.lockAspectRatio === false) {
      pushIssue(warnings, {
        code: 'chart.preset.lockedAspectRatioDisabled',
        message: '图表预设要求锁定宽高比，但实例已关闭 lockAspectRatio',
        path: 'size.lockAspectRatio',
        severity: 'warning'
      })
    } else if (Math.abs(currentRatio - expectedRatio) > 0.01) {
      pushIssue(warnings, {
        code: 'chart.preset.lockedAspectRatioChanged',
        message: '图表尺寸比例已偏离锁定宽高比预设',
        path: 'size',
        severity: 'warning'
      })
    }
  }
}

function validateFallbackResource(
  warnings: IChartGraphicValidationIssue[],
  chart: IChartGraphic,
  isSupportedKind: boolean
) {
  const fallback = chart.fallback
  if (!fallback) {
    if (!isSupportedKind) {
      pushIssue(warnings, {
        code: 'chart.fallback.missingForUnsupportedKind',
        message: '未知图表类型缺少 fallback，旧环境或导出链路无法降级展示',
        path: 'fallback',
        severity: 'warning'
      })
    }
    return
  }
  if (typeof fallback !== 'object') {
    pushIssue(warnings, {
      code: 'chart.fallback.invalid',
      message: 'fallback 必须是对象',
      path: 'fallback',
      severity: 'warning'
    })
    return
  }
  const hasSvg = typeof fallback.svg === 'string' && !!fallback.svg.trim()
  const hasPng = typeof fallback.png === 'string' && !!fallback.png.trim()
  if (!hasSvg && !hasPng) {
    pushIssue(warnings, {
      code: 'chart.fallback.empty',
      message: 'fallback 未包含可用的 SVG 或 PNG 资源，导出前需要重新生成',
      path: 'fallback',
      severity: 'warning'
    })
    return
  }
  if (
    hasSvg &&
    !fallback.svg!.includes('data-ce-chart-graphic-payload') &&
    !fallback.svg!.includes('data-chart-graphic')
  ) {
    pushIssue(warnings, {
      code: 'chart.fallback.svgMetadataMissing',
      message: 'SVG fallback 缺少图表恢复元数据，剪贴板或导入时只能降级为普通 SVG',
      path: 'fallback.svg',
      severity: 'warning'
    })
  }
  if (hasPng && !fallback.png!.startsWith('data:image/png')) {
    pushIssue(warnings, {
      code: 'chart.fallback.pngInvalid',
      message: 'PNG fallback 应使用 data:image/png 数据地址',
      path: 'fallback.png',
      severity: 'warning'
    })
  }
}

function validatePerformanceThresholds(
  warnings: IChartGraphicValidationIssue[],
  chart: IChartGraphic
) {
  if (chart.size && isPositiveFiniteNumber(chart.size.width) && isPositiveFiniteNumber(chart.size.height)) {
    const renderArea = chart.size.width * chart.size.height
    if (renderArea > RENDER_AREA_WARNING_THRESHOLD) {
      pushIssue(warnings, {
        code: 'chart.performance.renderAreaLarge',
        message: `图表渲染面积 ${renderArea} 超过建议阈值 ${RENDER_AREA_WARNING_THRESHOLD}，建议拆分窗口或降低导出倍率`,
        path: 'size',
        severity: 'warning'
      })
    }
    if (
      chart.pagination?.mode === 'vertical-slice' &&
      chart.size.height > VERTICAL_SLICE_HEIGHT_WARNING_THRESHOLD
    ) {
      pushIssue(warnings, {
        code: 'chart.performance.verticalSliceTall',
        message: `纵向分页图表高度 ${chart.size.height} 超过建议阈值 ${VERTICAL_SLICE_HEIGHT_WARNING_THRESHOLD}，建议确认导出和打印耗时`,
        path: 'pagination',
        severity: 'warning'
      })
    }
  }

  if (chart.kind !== 'dental' && Array.isArray(chart.series)) {
    let totalPointCount = 0
    chart.series.forEach((series, index) => {
      if (!Array.isArray(series.data)) return
      totalPointCount += series.data.length
      if (series.data.length > SERIES_POINT_COUNT_WARNING_THRESHOLD) {
        pushIssue(warnings, {
          code: 'chart.performance.seriesPointCountHigh',
          message: `单序列点位数 ${series.data.length} 超过建议阈值 ${SERIES_POINT_COUNT_WARNING_THRESHOLD}，建议启用窗口懒渲染或数据抽稀`,
          path: `series.${index}.data`,
          severity: 'warning'
        })
      }
    })
    if (totalPointCount > TOTAL_POINT_COUNT_WARNING_THRESHOLD) {
      pushIssue(warnings, {
        code: 'chart.performance.totalPointCountHigh',
        message: `图表总点位数 ${totalPointCount} 超过建议阈值 ${TOTAL_POINT_COUNT_WARNING_THRESHOLD}，导出和 Worker snapshot 可能变慢`,
        path: 'series',
        severity: 'warning'
      })
    }
  }

  const pagination = chart.pagination
  if (!pagination) return
  if (pagination.mode === 'time-window') {
    if (!isPositiveFiniteNumber(pagination.windowSize)) {
      pushIssue(warnings, {
        code: 'chart.performance.timeWindowSizeInvalid',
        message: 'time-window 分页需要提供大于 0 的 windowSize',
        path: 'pagination.windowSize',
        severity: 'warning'
      })
      return
    }
    const xAxis = chart.coordinate?.xAxis
    if (xAxis?.min === undefined || xAxis.max === undefined) return
    const xMin = toChartNumber(xAxis.min, Number.NaN)
    const xMax = toChartNumber(xAxis.max, Number.NaN)
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) {
      return
    }
    const fragmentCount = Math.ceil((xMax - xMin) / pagination.windowSize!)
    if (fragmentCount > TIME_WINDOW_FRAGMENT_COUNT_WARNING_THRESHOLD) {
      pushIssue(warnings, {
        code: 'chart.performance.timeWindowFragmentCountHigh',
        message: `time-window 预计生成 ${fragmentCount} 个片段，超过建议阈值 ${TIME_WINDOW_FRAGMENT_COUNT_WARNING_THRESHOLD}`,
        path: 'pagination.windowSize',
        severity: 'warning'
      })
    }
  }
}

/** 校验图表图形结构和核心数据质量。 */
export function validateChartGraphic(
  chart: IChartGraphic | null | undefined
): IChartGraphicValidationResult {
  const errors: IChartGraphicValidationIssue[] = []
  const warnings: IChartGraphicValidationIssue[] = []
  if (!chart || typeof chart !== 'object') {
    pushIssue(errors, {
      code: 'chart.missing',
      message: '图表模型不存在',
      path: 'chart',
      severity: 'error'
    })
    return {
      valid: false,
      errors
    }
  }
  const isSupportedKind = CHART_KIND_SET.has(chart.kind)
  if (!isSupportedKind) {
    pushIssue(errors, {
      code: 'chart.kindUnsupported',
      message: '图表类型不受支持',
      path: 'kind',
      severity: 'error'
    })
  }
  if (
    !chart.size ||
    !isPositiveFiniteNumber(chart.size.width) ||
    !isPositiveFiniteNumber(chart.size.height)
  ) {
    pushIssue(errors, {
      code: 'chart.sizeInvalid',
      message: '图表尺寸必须大于 0',
      path: 'size',
      severity: 'error'
    })
  } else {
    const padding = chart.coordinate?.padding || {}
    const plotWidth =
      chart.size.width - (padding.left || 0) - (padding.right || 0)
    const plotHeight =
      chart.size.height - (padding.top || 0) - (padding.bottom || 0)
    if (plotWidth <= 0 || plotHeight <= 0) {
      pushIssue(errors, {
        code: 'chart.plotAreaInvalid',
        message: '图表绘图区尺寸必须大于 0',
        path: 'coordinate.padding',
        severity: 'error'
      })
    }
  }
  validateAxisRange(errors, chart.coordinate?.xAxis, 'coordinate.xAxis')
  validateAxisRange(errors, chart.coordinate?.yAxis, 'coordinate.yAxis')
  if (chart.kind === 'dental') {
    validateDentalModel(errors, warnings, chart.dental)
  } else {
    validateSeriesList(
      errors,
      warnings,
      chart,
      chart.series,
      chart.coordinate?.xAxis
    )
  }
  validateDataSourceBinding(warnings, chart)
  validatePresetGovernance(warnings, chart)
  validateFallbackResource(warnings, chart, isSupportedKind)
  validatePerformanceThresholds(warnings, chart)
  return {
    valid: errors.length === 0,
    errors: errors.length ? errors : undefined,
    warnings: warnings.length ? warnings : undefined
  }
}
