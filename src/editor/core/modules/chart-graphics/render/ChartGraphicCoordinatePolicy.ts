import {
  IChartAnnotation,
  IChartAxis,
  IChartGraphic,
  IChartMark,
  IChartRegion,
  IChartSeries
} from '../../../../interface/ChartGraphic'
import {
  resolveChartAxisValueNumber,
  resolveChartSeriesDataPoints,
  toChartNumber
} from './ChartGraphicSeriesPointPolicy'

export interface IChartPoint {
  x: number
  y: number
}

export interface IChartPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface IChartRange {
  min: number
  max: number
  span: number
}

export interface IChartRenderContext {
  chart: IChartGraphic
  padding: IChartPadding
  plot: {
    x: number
    y: number
    width: number
    height: number
  }
  xAxis?: IChartAxis
  yAxis?: IChartAxis
  xRange: IChartRange
  yRange: IChartRange
}

export interface IChartAxisTick {
  value: number
  label: string
  position: number
}

export interface IChartLegendItemLayout {
  id: string
  label: string
  color: string
  x: number
  y: number
  width: number
  height: number
}

export interface IChartBarRect {
  x: number
  y: number
  width: number
  height: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** 解析图表 padding，沿用当前默认值。 */
export function resolveChartPadding(chart: IChartGraphic, height: number): IChartPadding {
  const padding = chart.coordinate?.padding || {}
  return {
    top: padding.top ?? Math.min(28, height * 0.16),
    right: padding.right ?? 24,
    bottom: padding.bottom ?? 34,
    left: padding.left ?? 42
  }
}

/** 根据 padding 计算绘图区。 */
export function resolveChartPlotArea(
  width: number,
  height: number,
  padding: IChartPadding
) {
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(1, width - padding.left - padding.right),
    height: Math.max(1, height - padding.top - padding.bottom)
  }
}

/** 将标记点转为数值坐标。 */
export function resolveChartRawMarkPoint(
  mark: IChartMark,
  xAxis?: IChartAxis,
  yAxis?: IChartAxis
): IChartPoint | null {
  if (mark.x === undefined || mark.y === undefined) return null
  return {
    x: resolveChartAxisValueNumber(mark.x, xAxis, 0),
    y: resolveChartAxisNumericYValue(mark.y, yAxis)
  }
}

/** 将标注点转为数值坐标。 */
export function resolveChartRawAnnotationPoint(
  annotation: IChartAnnotation,
  xAxis?: IChartAxis,
  yAxis?: IChartAxis
): IChartPoint | null {
  if (annotation.x === undefined || annotation.y === undefined) return null
  return {
    x: resolveChartAxisValueNumber(annotation.x, xAxis, 0),
    y: resolveChartAxisNumericYValue(annotation.y, yAxis)
  }
}

/** 将区间边界点转为数值坐标列表。 */
export function resolveChartRawRegionPointList(
  region: IChartRegion,
  xAxis?: IChartAxis,
  yAxis?: IChartAxis
): IChartPoint[] {
  const pointList: IChartPoint[] = []
  if (region.xStart !== undefined && region.yStart !== undefined) {
    pointList.push({
      x: resolveChartAxisValueNumber(region.xStart, xAxis, 0),
      y: resolveChartAxisNumericYValue(region.yStart, yAxis)
    })
  }
  if (region.xEnd !== undefined && region.yEnd !== undefined) {
    pointList.push({
      x: resolveChartAxisValueNumber(region.xEnd, xAxis, 0),
      y: resolveChartAxisNumericYValue(region.yEnd, yAxis)
    })
  }
  return pointList
}

/** 解析坐标轴可用范围。 */
export function resolveChartAxisRange(
  values: number[],
  axis?: IChartAxis
): IChartRange {
  if ((axis?.type === 'category' || axis?.type === 'ordinal') && axis.categories?.length) {
    const fallbackMax = Math.max(1, axis.categories.length - 1)
    const min =
      axis.min !== undefined
        ? resolveChartAxisValueNumber(axis.min, axis, 0)
        : 0
    const max =
      axis.max !== undefined
        ? resolveChartAxisValueNumber(axis.max, axis, fallbackMax)
        : fallbackMax
    const span = max - min || 1
    return {
      min,
      max,
      span
    }
  }
  const fallbackValues = values.length ? values : [0, 1]
  const min =
    axis?.min !== undefined
      ? toChartNumber(axis.min, 0)
      : Math.min(...fallbackValues)
  const max =
    axis?.max !== undefined
      ? toChartNumber(axis.max, 1)
      : Math.max(...fallbackValues)
  return {
    min,
    max,
    span: max - min || 1
  }
}

/** 解析图表完整绘制上下文。 */
export function resolveChartRenderContext(
  chart: IChartGraphic,
  width: number,
  height: number
): IChartRenderContext {
  const xAxis = chart.coordinate?.xAxis
  const yAxis = chart.coordinate?.yAxis
  const padding = resolveChartPadding(chart, height)
  const plot = resolveChartPlotArea(width, height, padding)
  const seriesPoints = (chart.series || []).flatMap(series =>
    resolveChartSeriesDataPoints(series, xAxis)
  )
  const barBaselinePoints = (chart.series || [])
    .filter(series => series.type === 'bar')
    .flatMap(series =>
      resolveChartSeriesDataPoints(series, xAxis).map(point => ({
        x: point.x,
        y: 0
      }))
    )
  const markPoints = (chart.marks || [])
    .map(mark => resolveChartRawMarkPoint(mark, xAxis, yAxis))
    .filter((point): point is IChartPoint => !!point)
  const regionPoints = (chart.regions || []).flatMap(region =>
    resolveChartRawRegionPointList(region, xAxis, yAxis)
  )
  const annotationPoints = (chart.annotations || [])
    .map(annotation => resolveChartRawAnnotationPoint(annotation, xAxis, yAxis))
    .filter((point): point is IChartPoint => !!point)
  const allPoints = [
    ...seriesPoints,
    ...barBaselinePoints,
    ...markPoints,
    ...regionPoints,
    ...annotationPoints
  ]
  const fallbackPoints = allPoints.length ? allPoints : [{ x: 0, y: 0 }, { x: 1, y: 1 }]
  return {
    chart,
    padding,
    plot,
    xAxis,
    yAxis,
    xRange: resolveChartAxisRange(
      fallbackPoints.map(point => point.x),
      xAxis
    ),
    yRange: resolveChartAxisRange(
      fallbackPoints.map(point => point.y),
      yAxis
    )
  }
}

/** 把图表点位换算到屏幕坐标。 */
export function resolveChartPointCoordinate(
  point: IChartPoint,
  context: IChartRenderContext
) {
  const { plot, xAxis, yAxis, xRange, yRange } = context
  const xRatio = resolveChartAxisRatio(point.x, xRange, xAxis)
  const yRatio = resolveChartAxisRatio(point.y, yRange, yAxis)
  return {
    x: plot.x + xRatio * plot.width,
    y: plot.y + plot.height - yRatio * plot.height
  }
}

/** 解析图表区间矩形。 */
export function resolveChartRegionRect(
  region: IChartRegion,
  context: IChartRenderContext
) {
  const { plot, xRange, yRange } = context
  const xStart =
    region.xStart === undefined
      ? plot.x
      : resolveChartPointCoordinate(
          {
            x: resolveChartAxisValueNumber(region.xStart, context.xAxis, xRange.min),
            y: yRange.min
          },
          context
        ).x
  const xEnd =
    region.xEnd === undefined
      ? plot.x + plot.width
      : resolveChartPointCoordinate(
          {
            x: resolveChartAxisValueNumber(region.xEnd, context.xAxis, xRange.max),
            y: yRange.min
          },
          context
        ).x
  const yStart =
    region.yStart === undefined
      ? plot.y + plot.height
      : resolveChartPointCoordinate(
          {
            x: xRange.min,
            y: resolveChartAxisNumericYValue(region.yStart, context.yAxis)
          },
          context
        ).y
  const yEnd =
    region.yEnd === undefined
      ? plot.y
      : resolveChartPointCoordinate(
          {
            x: xRange.min,
            y: resolveChartAxisNumericYValue(region.yEnd, context.yAxis)
          },
          context
        ).y
  return {
    x: Math.min(xStart, xEnd),
    y: Math.min(yStart, yEnd),
    width: Math.abs(xEnd - xStart),
    height: Math.abs(yEnd - yStart)
  }
}

/** 解析柱状序列单个柱体矩形。 */
export function resolveChartBarRect(payload: {
  chart: IChartGraphic
  series: IChartSeries
  point: IChartPoint
  context: IChartRenderContext
}): IChartBarRect | null {
  const { chart, series, point, context } = payload
  if (series.type !== 'bar') return null
  const barSeriesList = (chart.series || []).filter(item => item.type === 'bar')
  const barSeriesIndex = barSeriesList.findIndex(item => item.id === series.id)
  if (barSeriesIndex < 0) return null
  const slotSpan = resolveChartBarSlotSpan(chart, context)
  const groupWidthValue = slotSpan * 0.72
  const barWidthValue = groupWidthValue / Math.max(1, barSeriesList.length)
  const groupStartValue = point.x - groupWidthValue / 2
  const xStartValue = groupStartValue + barWidthValue * barSeriesIndex
  const xEndValue = xStartValue + barWidthValue
  const baselineValue = resolveChartBarBaselineValue(context.yRange)
  const left = resolveChartPointCoordinate(
    { x: xStartValue, y: baselineValue },
    context
  ).x
  const right = resolveChartPointCoordinate(
    { x: xEndValue, y: baselineValue },
    context
  ).x
  const top = resolveChartPointCoordinate(
    { x: point.x, y: point.y },
    context
  ).y
  const bottom = resolveChartPointCoordinate(
    { x: point.x, y: baselineValue },
    context
  ).y
  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.max(1, Math.abs(right - left)),
    height: Math.max(1, Math.abs(bottom - top))
  }
}

/** 解析坐标轴刻度列表和对应屏幕位置。 */
export function resolveChartAxisTickList(payload: {
  axis?: IChartAxis
  range: IChartRange
  plotStart: number
  plotSize: number
  defaultSegments: number
}) {
  const { axis, range, plotStart, plotSize, defaultSegments } = payload
  if ((axis?.type === 'category' || axis?.type === 'ordinal') && axis.categories?.length) {
    const step = Math.max(1, Math.floor(axis.tickInterval || 1))
    const start = Math.max(0, Math.ceil(range.min))
    const end = Math.min(axis.categories.length - 1, Math.floor(range.max))
    const tickList: IChartAxisTick[] = []
    for (let value = start; value <= end; value += step) {
      tickList.push({
        value,
        label: axis.categories[value] || String(value),
        position: plotStart + resolveChartAxisRatio(value, range, axis) * plotSize
      })
    }
    return tickList
  }
  const interval = axis?.tickInterval && axis.tickInterval > 0
    ? axis.tickInterval
    : range.span / Math.max(1, defaultSegments)
  const firstValue = Math.ceil(range.min / interval) * interval
  const tickList: IChartAxisTick[] = []
  for (
    let value = firstValue;
    value <= range.max + interval * 0.5;
    value += interval
  ) {
    const normalizedValue = normalizeChartTickValue(value)
    tickList.push({
      value: normalizedValue,
      label: resolveChartAxisTickLabel(axis, normalizedValue, range),
      position: plotStart + resolveChartAxisRatio(normalizedValue, range, axis) * plotSize
    })
  }
  if (!tickList.length) {
    return [
      {
        value: range.min,
        label: resolveChartAxisTickLabel(axis, range.min, range),
        position: plotStart
      },
      {
        value: range.max,
        label: resolveChartAxisTickLabel(axis, range.max, range),
        position: plotStart + plotSize
      }
    ]
  }
  return tickList
}

/** 解析图例布局，当前按顶部右侧单行排布。 */
export function resolveChartLegendLayout(
  chart: IChartGraphic,
  width: number,
  height: number
) {
  const seriesList = chart.series || []
  if (!seriesList.length || chart.kind === 'dental') {
    return []
  }
  const padding = resolveChartPadding(chart, height)
  const palette = chart.theme?.palette || ['#2563eb', '#dc2626', '#16a34a']
  const rowY = chart.title ? Math.max(12, padding.top - 12) : Math.max(8, padding.top - 12)
  let currentX = width - padding.right
  const itemList: IChartLegendItemLayout[] = []
  for (let index = seriesList.length - 1; index >= 0; index--) {
    const series = seriesList[index]
    const label = series.name || series.id
    const itemWidth = 20 + Math.max(12, label.length * 7)
    currentX -= itemWidth
    if (currentX < padding.left) {
      break
    }
    itemList.unshift({
      id: series.id,
      label,
      color: series.color || palette[index % palette.length],
      x: currentX,
      y: rowY,
      width: itemWidth,
      height: 12
    })
    currentX -= 10
  }
  return itemList
}

/** 判断命中点是否落在图例上。 */
export function isPointInChartLegend(
  legendItemList: IChartLegendItemLayout[],
  x: number,
  y: number
) {
  return legendItemList.some(item => {
    return (
      x >= item.x &&
      x <= item.x + item.width &&
      y >= item.y - 4 &&
      y <= item.y + item.height + 4
    )
  })
}

/** 把图表本地坐标换算回外部轴值。 */
export function resolveChartAxisPointValueFromLocalCoordinate(payload: {
  chart: IChartGraphic
  width: number
  height: number
  localX: number
  localY: number
}) {
  const context = resolveChartRenderContext(
    payload.chart,
    payload.width,
    payload.height
  )
  const { plot, xAxis, xRange, yAxis, yRange } = context
  const xRatio = Math.max(0, Math.min(1, (payload.localX - plot.x) / plot.width))
  const rawYRatio = Math.max(0, Math.min(1, (plot.height - (payload.localY - plot.y)) / plot.height))
  const xValue = resolveChartAxisPublicValue(
    payload.chart,
    xAxis,
    resolveChartAxisValueFromRatio(xRatio, xRange, xAxis)
  )
  const yValue = resolveChartAxisValueFromRatio(rawYRatio, yRange, yAxis)
  return {
    x: xValue,
    y: yValue
  }
}

function resolveChartAxisNumericYValue(value: number, axis?: IChartAxis) {
  if (axis?.type === 'category' || axis?.type === 'ordinal') {
    return resolveChartAxisValueNumber(String(value), axis, value)
  }
  return value
}

function resolveChartAxisRatio(value: number, range: IChartRange, axis?: IChartAxis) {
  const rawRatio = (value - range.min) / range.span
  const clampedRatio = Math.max(0, Math.min(1, rawRatio))
  return axis?.reverse ? 1 - clampedRatio : clampedRatio
}

function resolveChartAxisValueFromRatio(ratio: number, range: IChartRange, axis?: IChartAxis) {
  const normalizedRatio = axis?.reverse ? 1 - ratio : ratio
  return range.min + normalizedRatio * range.span
}

function resolveChartAxisPublicValue(
  chart: IChartGraphic,
  axis: IChartAxis | undefined,
  value: number
) {
  if ((axis?.type === 'category' || axis?.type === 'ordinal') && axis.categories?.length) {
    return axis.categories[Math.max(0, Math.min(axis.categories.length - 1, Math.round(value)))] || axis.categories[0]
  }
  if (axis?.type === 'time' || isChartAxisTimeLike(chart, axis)) {
    return new Date(value).toISOString()
  }
  return value
}

function resolveChartAxisTickLabel(
  axis: IChartAxis | undefined,
  value: number,
  range: IChartRange
) {
  if ((axis?.type === 'category' || axis?.type === 'ordinal') && axis.categories?.length) {
    return axis.categories[Math.round(value)] || ''
  }
  if (axis?.type === 'time') {
    return formatChartTimeLabel(value, range)
  }
  return formatChartNumberLabel(value)
}

function formatChartTimeLabel(value: number, range: IChartRange) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return formatChartNumberLabel(value)
  }
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  if (range.span >= ONE_DAY_MS * 3) {
    return `${month}-${day}`
  }
  return `${hour}:${minute}`
}

function formatChartNumberLabel(value: number) {
  const normalized = normalizeChartTickValue(value)
  if (Math.abs(normalized - Math.round(normalized)) < 1e-6) {
    return String(Math.round(normalized))
  }
  return String(normalized)
}

function normalizeChartTickValue(value: number) {
  return Number((Math.round(value * 100) / 100).toString())
}

function resolveChartBarSlotSpan(
  chart: IChartGraphic,
  context: IChartRenderContext
) {
  if (
    (context.xAxis?.type === 'category' || context.xAxis?.type === 'ordinal') &&
    context.xAxis.categories?.length
  ) {
    return 1
  }
  const xValueList = Array.from(
    new Set(
      (chart.series || [])
        .filter(series => series.type === 'bar')
        .flatMap(series =>
          resolveChartSeriesDataPoints(series, context.xAxis).map(point => point.x)
        )
    )
  ).sort((left, right) => left - right)
  const diffList: number[] = []
  for (let index = 1; index < xValueList.length; index++) {
    const diff = xValueList[index] - xValueList[index - 1]
    if (diff > 0) {
      diffList.push(diff)
    }
  }
  if (diffList.length) {
    return Math.min(...diffList)
  }
  const fallbackSpan = context.xRange.span / Math.max(4, xValueList.length + 1)
  return fallbackSpan > 0 ? fallbackSpan : 1
}

function resolveChartBarBaselineValue(range: IChartRange) {
  if (range.min <= 0 && range.max >= 0) {
    return 0
  }
  return range.min > 0 ? range.min : range.max
}

function isChartAxisTimeLike(chart: IChartGraphic, axis?: IChartAxis) {
  if (axis?.type === 'time') return true
  if (axis?.type && axis.type !== 'linear') return false
  for (const series of chart.series || []) {
    for (const point of series.data) {
      if (typeof point === 'number') continue
      const rawX = point.x
      return (
        typeof rawX === 'string' &&
        Number.isNaN(Number(rawX)) &&
        Number.isFinite(Date.parse(rawX))
      )
    }
  }
  return false
}
