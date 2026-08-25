import {
  IChartGraphic,
  IChartMark
} from '../model/ChartGraphic'
import {
  IChartPoint,
  IChartRenderContext,
  resolveChartPointCoordinate
} from './ChartGraphicCoordinatePolicy'
import { resolveChartAxisValueNumber } from './ChartGraphicSeriesPointPolicy'

export interface IChartMedicalBandLayout {
  headerHeight: number
  eventTrack?: {
    x: number
    y: number
    width: number
    height: number
  }
}

/** 解析体温单和麻醉记录的重复表头、事件轨道布局。 */
export function resolveChartMedicalBandLayout(
  chart: IChartGraphic,
  context: IChartRenderContext
): IChartMedicalBandLayout | null {
  if (chart.kind !== 'vital-signs' && chart.kind !== 'anesthesia') {
    return null
  }
  const headerHeight = Math.max(
    24,
    chart.pagination?.repeatedHeaderHeight || 28
  )
  const eventTrackHeight = Math.max(
    18,
    chart.pagination?.eventTrackHeight || 20
  )
  return {
    headerHeight,
    eventTrack: {
      x: context.plot.x,
      y: context.plot.y + context.plot.height + 26,
      width: context.plot.width,
      height: eventTrackHeight
    }
  }
}

/** 生成医疗表头的窗口说明文本。 */
export function resolveChartMedicalHeaderText(chart: IChartGraphic) {
  const xAxis = chart.coordinate?.xAxis
  const min = xAxis?.min
  const max = xAxis?.max
  if (min === undefined || max === undefined) return chart.title || ''
  const unit = chart.kind === 'anesthesia' ? 'min' : '日'
  return `${chart.title || ''}  ${String(min)}-${String(max)} ${unit}`
}

/** 解析医疗事件标记在独立事件轨道中的坐标。 */
export function resolveChartMedicalMarkCoordinate(
  chart: IChartGraphic,
  mark: IChartMark,
  context: IChartRenderContext
): IChartPoint | null {
  const layout = resolveChartMedicalBandLayout(chart, context)
  if (!layout?.eventTrack || mark.x === undefined) return null
  const x = resolveChartAxisValueNumber(mark.x, context.xAxis, 0)
  const coordinate = resolveChartPointCoordinate(
    { x, y: context.yRange.min },
    context
  )
  return {
    x: coordinate.x,
    y: layout.eventTrack.y + layout.eventTrack.height / 2
  }
}
