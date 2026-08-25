import { IChartPoint } from './ChartGraphicCoordinatePolicy'

export interface IChartCubicBezierSegment {
  start: IChartPoint
  control1: IChartPoint
  control2: IChartPoint
  end: IChartPoint
}

/** 使用相邻点切线生成平滑折线的三次贝塞尔段。 */
export function resolveChartSmoothBezierSegmentList(
  pointList: IChartPoint[]
): IChartCubicBezierSegment[] {
  const segmentList: IChartCubicBezierSegment[] = []
  for (let index = 0; index < pointList.length - 1; index++) {
    const previous = pointList[Math.max(0, index - 1)]
    const start = pointList[index]
    const end = pointList[index + 1]
    const next = pointList[Math.min(pointList.length - 1, index + 2)]
    segmentList.push({
      start,
      control1: {
        x: start.x + (end.x - previous.x) / 6,
        y: start.y + (end.y - previous.y) / 6
      },
      control2: {
        x: end.x - (next.x - start.x) / 6,
        y: end.y - (next.y - start.y) / 6
      },
      end
    })
  }
  return segmentList
}

/** 计算三次贝塞尔曲线指定比例的点。 */
export function resolveChartCubicBezierPoint(
  segment: IChartCubicBezierSegment,
  ratio: number
): IChartPoint {
  const inverse = 1 - ratio
  const startWeight = inverse ** 3
  const control1Weight = 3 * inverse ** 2 * ratio
  const control2Weight = 3 * inverse * ratio ** 2
  const endWeight = ratio ** 3
  return {
    x:
      segment.start.x * startWeight +
      segment.control1.x * control1Weight +
      segment.control2.x * control2Weight +
      segment.end.x * endWeight,
    y:
      segment.start.y * startWeight +
      segment.control1.y * control1Weight +
      segment.control2.y * control2Weight +
      segment.end.y * endWeight
  }
}

/** 将平滑曲线离散为命中检测使用的短线段点位。 */
export function flattenChartSmoothBezierSegmentList(
  segmentList: IChartCubicBezierSegment[],
  stepsPerSegment = 12
) {
  if (!segmentList.length) return []
  const pointList = [segmentList[0].start]
  segmentList.forEach(segment => {
    for (let step = 1; step <= stepsPerSegment; step++) {
      pointList.push(
        resolveChartCubicBezierPoint(segment, step / stepsPerSegment)
      )
    }
  })
  return pointList
}
