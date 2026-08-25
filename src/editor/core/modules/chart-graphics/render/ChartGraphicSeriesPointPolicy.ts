import {
  IChartAxis,
  IChartDataPoint,
  IChartSeries
} from '../../../../interface/ChartGraphic'

/** 归一化后的图表序列点。 */
export interface IResolvedChartSeriesPoint {
  /** 横轴数值。 */
  x: number
  /** 纵轴数值。 */
  y: number
  /** 原始数据索引。 */
  dataIndex: number
}

interface IChartSeriesDownsampleBucket {
  first: IResolvedChartSeriesPoint
  last: IResolvedChartSeriesPoint
  minY: IResolvedChartSeriesPoint
  maxY: IResolvedChartSeriesPoint
}

/** 将原始序列数据归一化成数值点位。 */
export function resolveChartSeriesDataPoints(
  series: IChartSeries,
  xAxis?: IChartAxis
): IResolvedChartSeriesPoint[] {
  return series.data
    .map((point, index) => {
      if (typeof point === 'number') {
        return {
          x: index,
          y: point,
          dataIndex: index
        }
      }
      return {
        x: resolveChartAxisValueNumber((point as IChartDataPoint).x, xAxis, index),
        y: (point as IChartDataPoint).y,
        dataIndex: index
      }
    })
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
}

/** 将轴值转换为可比较数值，分类轴优先映射到 categories 索引。 */
export function resolveChartAxisValueNumber(
  value: number | string,
  axis: IChartAxis | undefined,
  fallback: number
) {
  if (axis?.type === 'category' || axis?.type === 'ordinal') {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    const numeric = Number(value)
    if (Number.isFinite(numeric)) {
      return numeric
    }
    const categoryIndex = axis.categories?.indexOf(String(value)) ?? -1
    if (categoryIndex >= 0) {
      return categoryIndex
    }
    return fallback
  }
  return toChartNumber(value, fallback)
}

/** 将数值或时间值转换为图表可比较数值。 */
export function toChartNumber(value: number | string, fallback: number) {
  if (typeof value === 'number') return value
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : fallback
}

/** 判断序列是否需要按像素列抽稀。 */
export function shouldDownsampleChartSeries(
  series: IChartSeries,
  points: IResolvedChartSeriesPoint[],
  plotWidth: number
) {
  if (series.type === 'bar') return false
  if (series.type === 'waveform') return points.length > plotWidth * 2
  return points.length > plotWidth * 4
}

/** 按横向像素列抽稀，保留每列的首尾和 y 方向峰谷。 */
export function downsampleChartSeriesPoints(payload: {
  series: IChartSeries
  points: IResolvedChartSeriesPoint[]
  xMin: number
  xSpan: number
  plotWidth: number
}): IResolvedChartSeriesPoint[] {
  const { series, points, xMin, xSpan, plotWidth } = payload
  if (!points.length || !shouldDownsampleChartSeries(series, points, plotWidth)) {
    return points
  }
  const safePlotWidth = Math.max(1, Math.floor(plotWidth))
  const safeXSpan = xSpan || 1
  const bucketMap = new Map<number, IChartSeriesDownsampleBucket>()
  points.forEach(point => {
    const bucketIndex = Math.max(
      0,
      Math.min(
        safePlotWidth,
        Math.floor(((point.x - xMin) / safeXSpan) * safePlotWidth)
      )
    )
    const bucket = bucketMap.get(bucketIndex)
    if (!bucket) {
      bucketMap.set(bucketIndex, {
        first: point,
        last: point,
        minY: point,
        maxY: point
      })
      return
    }
    bucket.last = point
    if (point.y < bucket.minY.y) bucket.minY = point
    if (point.y > bucket.maxY.y) bucket.maxY = point
  })
  return Array.from(bucketMap.values()).flatMap(bucket => {
    const uniquePointMap = new Map<number, IResolvedChartSeriesPoint>()
    ;[bucket.first, bucket.minY, bucket.maxY, bucket.last].forEach(point => {
      uniquePointMap.set(point.dataIndex, point)
    })
    return Array.from(uniquePointMap.values()).sort(
      (left, right) => left.dataIndex - right.dataIndex
    )
  })
}
