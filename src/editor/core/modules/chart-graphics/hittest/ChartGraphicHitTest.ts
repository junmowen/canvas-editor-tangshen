import {
  DentalSurface,
  IChartGraphic,
  IChartGraphicHitResult,
  IChartSeries
} from '../../../../interface/ChartGraphic'
import {
  isPointInDentalPolygon,
  resolveDentalToothPathGeometry
} from '../render/DentalChartRenderPolicy'
import {
  IChartPoint,
  IChartRenderContext,
  isPointInChartLegend,
  resolveChartBarRect,
  resolveChartLegendLayout,
  resolveChartPointCoordinate,
  resolveChartRawAnnotationPoint,
  resolveChartRawMarkPoint,
  resolveChartRegionRect,
  resolveChartRenderContext
} from '../render/ChartGraphicCoordinatePolicy'
import { resolveChartSeriesDataPoints } from '../render/ChartGraphicSeriesPointPolicy'
import {
  flattenChartSmoothBezierSegmentList,
  resolveChartSmoothBezierSegmentList
} from '../render/ChartGraphicSeriesGeometryPolicy'
import { filterChartGraphicPointsToVisibleWindow } from '../layout/ChartGraphicFragmentPolicy'
import { resolveChartMedicalMarkCoordinate } from '../render/ChartGraphicMedicalRenderPolicy'
import {
  isEcgChart,
  resolveEcgSeriesRenderContext
} from '../render/ChartGraphicEcgRenderPolicy'

export interface IChartGraphicHitTestPayload {
  chart: IChartGraphic
  width: number
  height: number
  x: number
  y: number
  tolerance?: number
}

function isInsideRect(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number }
) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

function getDistance(a: IChartPoint, b: IChartPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getDistanceToSegment(
  point: IChartPoint,
  start: IChartPoint,
  end: IChartPoint
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (!dx && !dy) {
    return getDistance(point, start)
  }
  const projectionRatio =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
    (dx * dx + dy * dy)
  const clampedRatio = Math.max(0, Math.min(1, projectionRatio))
  return getDistance(point, {
    x: start.x + dx * clampedRatio,
    y: start.y + dy * clampedRatio
  })
}

function resolveDentalSurfaceHit(payload: {
  toothCode: string
  x: number
  y: number
  toothX: number
  toothY: number
  toothWidth: number
  toothHeight: number
  isTopRow: boolean
}): DentalSurface | null {
  const {
    toothCode,
    x,
    y,
    toothX,
    toothY,
    toothWidth,
    toothHeight,
    isTopRow
  } = payload
  const geometry = resolveDentalToothPathGeometry({
    toothCode,
    x: toothX,
    y: toothY,
    width: toothWidth,
    height: toothHeight,
    isTopRow
  })
  return (
    geometry.surfaceList.find(surface =>
      isPointInDentalPolygon({ x, y }, surface.pointList)
    )?.surface || null
  )
}

function hitDentalChart(payload: IChartGraphicHitTestPayload): IChartGraphicHitResult | null {
  const { chart, width, height, x, y } = payload
  const teeth = chart.dental?.teeth || []
  const startX = 24
  const toothWidth = Math.max(22, (width - startX * 2) / 16 - 4)
  const toothHeight = 58
  const rowList = [
    { teeth: teeth.slice(0, 16), y: 56, isTopRow: true },
    { teeth: teeth.slice(16, 32), y: 166, isTopRow: false }
  ]
  for (const row of rowList) {
    for (let index = 0; index < row.teeth.length; index++) {
      const tooth = row.teeth[index]
      const toothX = startX + index * (toothWidth + 4)
      const geometry = resolveDentalToothPathGeometry({
        toothCode: tooth.code,
        x: toothX,
        y: row.y,
        width: toothWidth,
        height: toothHeight,
        isTopRow: row.isTopRow
      })
      if (isPointInDentalPolygon({ x, y }, geometry.toothHitPointList)) {
        const dentalSurface = resolveDentalSurfaceHit({
          toothCode: tooth.code,
          x,
          y,
          toothX,
          toothY: row.y,
          toothWidth,
          toothHeight,
          isTopRow: row.isTopRow
        })
        if (dentalSurface) {
          return {
            target: 'dental-surface',
            toothCode: tooth.code,
            dentalSurface
          }
        }
        return {
          target: 'dental-tooth',
          toothCode: tooth.code
        }
      }
    }
  }
  if (isInsideRect(x, y, { x: startX, y: height - 32, width: 360, height: 22 })) {
    return { target: 'legend' }
  }
  return isInsideRect(x, y, { x: 0, y: 0, width, height }) ? { target: 'frame' } : null
}

function hitSeriesLine(
  series: IChartSeries,
  points: IChartPoint[],
  context: IChartRenderContext,
  cursor: IChartPoint,
  tolerance: number
) {
  if (series.type === 'scatter' || series.type === 'bar' || points.length < 2) {
    return false
  }
  const coordinateList = points.map(point =>
    resolveChartPointCoordinate(point, context)
  )
  const hitPointList =
    series.type === 'smoothLine'
      ? flattenChartSmoothBezierSegmentList(
          resolveChartSmoothBezierSegmentList(coordinateList)
        )
      : coordinateList
  for (let index = 1; index < hitPointList.length; index++) {
    const previous = hitPointList[index - 1]
    const current = hitPointList[index]
    if (series.type === 'stepLine') {
      const horizontalStepPoint = {
        x: current.x,
        y: previous.y
      }
      if (
        getDistanceToSegment(cursor, previous, horizontalStepPoint) <= tolerance ||
        getDistanceToSegment(cursor, horizontalStepPoint, current) <= tolerance
      ) {
        return true
      }
      continue
    }
    if (getDistanceToSegment(cursor, previous, current) <= tolerance) {
      return true
    }
  }
  return false
}

/** 命中图表图形内部对象，坐标为图表元素本地坐标。 */
export function hitTestChartGraphic(
  payload: IChartGraphicHitTestPayload
): IChartGraphicHitResult | null {
  const { chart, width, height, x, y, tolerance = 8 } = payload
  if (chart.kind === 'dental') return hitDentalChart(payload)
  const context = resolveChartRenderContext(chart, width, height)
  const cursor = { x, y }
  const legendItemList = resolveChartLegendLayout(chart, width, height)

  for (const annotation of chart.annotations || []) {
    const point = resolveChartRawAnnotationPoint(
      annotation,
      context.xAxis,
      context.yAxis
    )
    if (!point) continue
    const coordinate = resolveChartPointCoordinate(point, context)
    const rect = {
      x: coordinate.x,
      y: coordinate.y - 8,
      width: Math.max(12, annotation.text.length * 7 + 6),
      height: 16
    }
    if (isInsideRect(x, y, rect)) {
      return {
        target: 'annotation',
        annotationId: annotation.id
      }
    }
  }

  for (const mark of chart.marks || []) {
    const point = resolveChartRawMarkPoint(mark, context.xAxis, context.yAxis)
    const coordinate =
      resolveChartMedicalMarkCoordinate(chart, mark, context) ||
      (point ? resolveChartPointCoordinate(point, context) : null)
    if (!coordinate) continue
    if (getDistance(cursor, coordinate) <= tolerance) {
      return {
        target: 'mark',
        markId: mark.id
      }
    }
  }

  const seriesList = chart.series || []
  for (let seriesIndex = 0; seriesIndex < seriesList.length; seriesIndex++) {
    const series = seriesList[seriesIndex]
    const seriesContext = isEcgChart(chart)
      ? resolveEcgSeriesRenderContext(chart, context, series, seriesIndex).context
      : context
    const points = filterChartGraphicPointsToVisibleWindow(
      resolveChartSeriesDataPoints(series, seriesContext.xAxis),
      chart
    )
    for (let index = 0; index < points.length; index++) {
      if (series.type === 'bar') {
        const rect = resolveChartBarRect({
          chart,
          series,
          point: points[index],
          context: seriesContext
        })
        if (
          rect &&
          isInsideRect(x, y, {
            x: rect.x - tolerance * 0.5,
            y: rect.y,
            width: rect.width + tolerance,
            height: rect.height
          })
        ) {
          return {
            target: 'series-point',
            seriesId: series.id,
            dataIndex: points[index].dataIndex
          }
        }
      }
      const coordinate = resolveChartPointCoordinate(points[index], seriesContext)
      if (getDistance(cursor, coordinate) <= tolerance) {
        return {
          target: 'series-point',
          seriesId: series.id,
          dataIndex: points[index].dataIndex
        }
      }
    }
  }

  for (let seriesIndex = 0; seriesIndex < seriesList.length; seriesIndex++) {
    const series = seriesList[seriesIndex]
    const seriesContext = isEcgChart(chart)
      ? resolveEcgSeriesRenderContext(chart, context, series, seriesIndex).context
      : context
    const points = filterChartGraphicPointsToVisibleWindow(
      resolveChartSeriesDataPoints(series, seriesContext.xAxis),
      chart
    )
    if (!hitSeriesLine(series, points, seriesContext, cursor, tolerance)) continue
    return {
      target: 'series-line',
      seriesId: series.id
    }
  }

  for (const region of chart.regions || []) {
    const rect = resolveChartRegionRect(region, context)
    if (rect.width && rect.height && isInsideRect(x, y, rect)) {
      return {
        target: 'region',
        regionId: region.id
      }
    }
  }

  if (isPointInChartLegend(legendItemList, x, y)) return { target: 'legend' }
  if (isInsideRect(x, y, context.plot)) return { target: 'plot-area' }
  return isInsideRect(x, y, { x: 0, y: 0, width, height }) ? { target: 'frame' } : null
}
