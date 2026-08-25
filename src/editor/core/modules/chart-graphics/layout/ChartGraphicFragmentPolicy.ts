import {
  IChartGraphic,
  IChartGraphicFragmentDescriptor
} from '../model/ChartGraphic'
import { IElement, IElementMetrics } from '../../../../interface/Element'
import { IRow, IRowElement } from '../../../../interface/Row'
import { deepClone } from '../../../../utils'
import { isChartGraphicElement } from '../utils/ChartGraphicUtils'
import {
  resolveChartAxisValueNumber,
  resolveChartSeriesDataPoints,
  toChartNumber
} from '../render/ChartGraphicSeriesPointPolicy'

export interface IResolvedChartGraphicFragmentRenderState {
  fragment?: IChartGraphicFragmentDescriptor
  fullWidth: number
  fullHeight: number
  visibleWidth: number
  visibleHeight: number
  offsetY: number
}

export interface IChartGraphicTimeWindow {
  xMin: number
  xMax: number
  fragmentIndex: number
  fragmentCount: number
}

/** 判断当前行是否是单个图表元素行。 */
export function isSingleChartGraphicElementRow(row: IRow) {
  return row.elementList.length === 1 && isChartGraphicElement(row.elementList[0])
}

/** 解析图表当前片段的完整尺寸、可见尺寸和纵向窗口。 */
export function resolveChartGraphicFragmentRenderState(payload: {
  element: Pick<IElement, 'chartGraphic' | 'chartGraphicFragment' | 'width' | 'height'> & {
    metrics?: Pick<IElementMetrics, 'width' | 'height'>
  }
  metrics?: Pick<IElementMetrics, 'width' | 'height'> | null
}): IResolvedChartGraphicFragmentRenderState | null {
  const { element, metrics } = payload
  const chart = element.chartGraphic
  if (!chart) return null
  const fragment = element.chartGraphicFragment
  const visibleWidth =
    metrics?.width || element.metrics?.width || element.width || chart.size.width
  const measuredHeight =
    metrics?.height || element.metrics?.height || element.height || chart.size.height
  return {
    fragment,
    fullWidth: fragment?.fullWidth || visibleWidth,
    fullHeight: fragment?.fullHeight || measuredHeight,
    visibleWidth,
    visibleHeight: fragment?.fragmentHeight || measuredHeight,
    offsetY: fragment?.offsetY || 0
  }
}

/** 解析 time-window 图表需要生成的横轴窗口列表。 */
export function resolveChartGraphicTimeWindowList(
  chart: IChartGraphic
): IChartGraphicTimeWindow[] {
  const pagination = chart.pagination
  const xAxis = chart.coordinate?.xAxis
  if (
    pagination?.mode !== 'time-window' ||
    !pagination.windowSize ||
    pagination.windowSize <= 0
  ) {
    return []
  }
  const pointList = (chart.series || []).flatMap(series =>
    resolveChartSeriesDataPoints(series, xAxis)
  )
  const markXList = (chart.marks || [])
    .filter(mark => mark.x !== undefined)
    .map((mark, index) =>
      resolveChartAxisValueNumber(mark.x!, xAxis, index)
    )
  const xValueList = [
    ...pointList.map(point => point.x),
    ...markXList
  ].filter(Number.isFinite)
  const fallbackMin = xValueList.length ? Math.min(...xValueList) : 0
  const fallbackMax = xValueList.length ? Math.max(...xValueList) : fallbackMin
  const xMin =
    xAxis?.min !== undefined ? toChartNumber(xAxis.min, fallbackMin) : fallbackMin
  const xMax =
    xAxis?.max !== undefined ? toChartNumber(xAxis.max, fallbackMax) : fallbackMax
  const windowSize = pagination.windowSize
  const fragmentCount = Math.max(1, Math.ceil((xMax - xMin) / windowSize))
  return Array.from({ length: fragmentCount }, (_, fragmentIndex) => ({
    xMin: xMin + fragmentIndex * windowSize,
    xMax: Math.min(xMax, xMin + (fragmentIndex + 1) * windowSize),
    fragmentIndex,
    fragmentCount
  }))
}

/** 为当前 fragment 创建独立坐标窗口和可见医疗对象快照。 */
export function resolveChartGraphicFragmentChart(
  chart: IChartGraphic,
  fragment?: IChartGraphicFragmentDescriptor
) {
  if (
    fragment?.mode !== 'time-window' ||
    fragment.xMin === undefined ||
    fragment.xMax === undefined
  ) {
    return chart
  }
  const nextChart = deepClone(chart)
  nextChart.coordinate = {
    ...nextChart.coordinate,
    xAxis: {
      ...(nextChart.coordinate?.xAxis || { type: 'linear' as const }),
      min: fragment.xMin,
      max: fragment.xMax
    }
  }
  const xAxis = chart.coordinate?.xAxis
  const isVisibleX = (value: number | string | undefined, fallback: number) => {
    if (value === undefined) return false
    const x = resolveChartAxisValueNumber(value, xAxis, fallback)
    return x >= fragment.xMin! && x <= fragment.xMax!
  }
  nextChart.marks = (nextChart.marks || []).filter((mark, index) =>
    isVisibleX(mark.x, index)
  )
  nextChart.annotations = (nextChart.annotations || []).filter(
    (annotation, index) => isVisibleX(annotation.x, index)
  )
  nextChart.regions = (nextChart.regions || []).filter((region, index) => {
    const start =
      region.xStart === undefined
        ? fragment.xMin!
        : resolveChartAxisValueNumber(region.xStart, xAxis, index)
    const end =
      region.xEnd === undefined
        ? fragment.xMax!
        : resolveChartAxisValueNumber(region.xEnd, xAxis, index)
    return Math.max(start, fragment.xMin!) <= Math.min(end, fragment.xMax!)
  })
  return nextChart
}

/** 只保留当前坐标窗口内的序列点，保留原始 dataIndex。 */
export function filterChartGraphicPointsToVisibleWindow<T extends { x: number }>(
  pointList: T[],
  chart: IChartGraphic
) {
  const xAxis = chart.coordinate?.xAxis
  if (xAxis?.min === undefined || xAxis.max === undefined) return pointList
  const xMin = toChartNumber(xAxis.min, Number.NEGATIVE_INFINITY)
  const xMax = toChartNumber(xAxis.max, Number.POSITIVE_INFINITY)
  return pointList.filter(point => point.x >= xMin && point.x <= xMax)
}

/** 把 fragment 本地坐标换算回完整图表坐标。 */
export function resolveChartGraphicFragmentLocalY(payload: {
  element: Pick<IRowElement, 'chartGraphicFragment'>
  localY: number
}) {
  return payload.localY + (payload.element.chartGraphicFragment?.offsetY || 0)
}

/** 读取图表行的上下附加占高，供分页碎片化时保留原始行盒语义。 */
export function resolveChartGraphicRowBoxPadding(payload: {
  row: Pick<IRow, 'height' | 'ascent'>
  fullHeight: number
}) {
  const { row, fullHeight } = payload
  const topPadding = Math.max(0, Math.min(row.ascent, row.height))
  const bottomPadding = Math.max(0, row.height - topPadding - fullHeight)
  return {
    topPadding,
    bottomPadding
  }
}

/** 判断当前图表行是否需要进入跨页碎片化流程。 */
export function shouldFragmentChartGraphicRow(payload: {
  row: IRow
  rowOffsetY: number
  pageHeight: number
  pageLimitHeight: number
  pageContentHeight: number
}) {
  const { row, rowOffsetY, pageHeight, pageLimitHeight, pageContentHeight } = payload
  if (!isSingleChartGraphicElementRow(row)) {
    return false
  }
  const sourceChart = row.elementList[0]
  if (resolveChartGraphicTimeWindowList(sourceChart.chartGraphic!).length > 1) {
    return true
  }
  if (row.height + rowOffsetY + pageHeight <= pageLimitHeight) {
    return false
  }
  const renderState = resolveChartGraphicFragmentRenderState({
    element: sourceChart,
    metrics: sourceChart.metrics
  })
  if (!renderState) {
    return false
  }
  const { topPadding, bottomPadding } = resolveChartGraphicRowBoxPadding({
    row,
    fullHeight: renderState.fullHeight
  })
  return renderState.fullHeight > Math.max(0, pageContentHeight - topPadding - bottomPadding)
}
