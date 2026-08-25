import {
  IChartGraphicSnapshot
} from '../../../../interface/ChartGraphic'
import { IElement } from '../../../../interface/Element'
import {
  downsampleChartSeriesPoints,
  resolveChartSeriesDataPoints
} from '../render/ChartGraphicSeriesPointPolicy'
import { resolveChartRenderContext } from '../render/ChartGraphicCoordinatePolicy'
import { isChartGraphicElement } from '../command/ChartGraphicCommandPolicy'
import {
  isEcgChart,
  resolveEcgSeriesRenderContext
} from '../render/ChartGraphicEcgRenderPolicy'

/** 创建图表图形渲染 / 调试快照。 */
export function createChartGraphicSnapshot(
  element: IElement | null | undefined
): IChartGraphicSnapshot | null {
  if (!isChartGraphicElement(element)) return null
  const chart = element.chartGraphic
  const width = element.width || chart.size.width
  const height = element.height || chart.size.height
  const context = resolveChartRenderContext(chart, width, height)
  return {
    elementId: element.id,
    kind: chart.kind,
    width,
    height,
    series: (chart.series || []).map((series, seriesIndex) => {
      const seriesContext = isEcgChart(chart)
        ? resolveEcgSeriesRenderContext(chart, context, series, seriesIndex).context
        : context
      const rawPointList = resolveChartSeriesDataPoints(
        series,
        seriesContext.xAxis
      )
      const renderPointList = downsampleChartSeriesPoints({
        series,
        points: rawPointList,
        xMin: seriesContext.xRange.min,
        xSpan: seriesContext.xRange.span,
        plotWidth: seriesContext.plot.width
      })
      return {
        id: series.id,
        type: series.type,
        rawPointCount: rawPointList.length,
        renderPointCount: renderPointList.length
      }
    }),
    markCount: chart.marks?.length || 0,
    regionCount: chart.regions?.length || 0,
    annotationCount: chart.annotations?.length || 0,
    dentalToothCount: chart.dental?.teeth.length || 0,
    sourceId: chart.source?.sourceId,
    sourceVersion: chart.source?.version
  }
}
