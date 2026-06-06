import {
  escapePrintSvgAttr,
  normalizePrintSvgOpacity
} from './core'
export interface IPrintSvgStrokeSegment {
  /** 起点坐标。 */
  from: [number, number]
  /** 终点坐标。 */
  to: [number, number]
}

/** 创建 SVG path 边框，集中处理颜色、线宽和虚线。 */
export function createPrintSvgStrokePath(payload: {
  /** 线段列表。 */
  segmentList: IPrintSvgStrokeSegment[]
  /** 边框颜色。 */
  stroke: string
  /** 边框宽度。 */
  lineWidth: number
  /** 透明度。 */
  opacity?: number
  /** 虚线配置。 */
  lineDash?: number[]
}) {
  const { segmentList, stroke, lineWidth, opacity, lineDash } = payload
  if (!segmentList.length) return ''
  const d = segmentList
    .map(segment => `M ${segment.from[0]} ${segment.from[1]} L ${segment.to[0]} ${segment.to[1]}`)
    .join(' ')
  const dashAttr = lineDash?.length
    ? ` stroke-dasharray="${lineDash.join(' ')}"`
    : ''
  const opacityAttr =
    opacity === undefined ? '' : ` opacity="${normalizePrintSvgOpacity(opacity)}"`
  return `<path d="${escapePrintSvgAttr(d)}" fill="none" stroke="${escapePrintSvgAttr(stroke)}" stroke-width="${lineWidth}"${dashAttr}${opacityAttr}/>`
}

/** 创建 SVG 矩形填充，服务表格背景、背景色和页边框默认绘制。 */
export function createPrintSvgRect(payload: {
  /** 横向起点。 */
  x: number
  /** 纵向起点。 */
  y: number
  /** 宽度。 */
  width: number
  /** 高度。 */
  height: number
  /** 填充颜色。 */
  fill?: string
  /** 描边颜色。 */
  stroke?: string
  /** 描边宽度。 */
  strokeWidth?: number
  /** 透明度。 */
  opacity?: number
  /** 虚线配置。 */
  lineDash?: number[]
}) {
  const { x, y, width, height, fill, stroke, strokeWidth, opacity, lineDash } =
    payload
  if (width <= 0 || height <= 0) return ''
  const fillAttr = fill ? ` fill="${escapePrintSvgAttr(fill)}"` : ' fill="none"'
  const strokeAttr = stroke
    ? ` stroke="${escapePrintSvgAttr(stroke)}" stroke-width="${strokeWidth || 1}"`
    : ''
  const opacityAttr =
    opacity === undefined ? '' : ` opacity="${normalizePrintSvgOpacity(opacity)}"`
  const dashAttr = lineDash?.length
    ? ` stroke-dasharray="${lineDash.join(' ')}"`
    : ''
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}"${fillAttr}${strokeAttr}${dashAttr}${opacityAttr}/>`
}

/** 创建 SVG 圆形，服务单选框、复选框和列表粒子。 */
export function createPrintSvgCircle(payload: {
  /** 圆心横坐标。 */
  cx: number
  /** 圆心纵坐标。 */
  cy: number
  /** 半径。 */
  r: number
  /** 填充色。 */
  fill?: string
  /** 描边色。 */
  stroke?: string
  /** 描边宽度。 */
  strokeWidth?: number
  /** 透明度。 */
  opacity?: number
}) {
  const { cx, cy, r, fill, stroke, strokeWidth, opacity } = payload
  if (r <= 0) return ''
  const fillAttr = fill ? ` fill="${escapePrintSvgAttr(fill)}"` : ' fill="none"'
  const strokeAttr = stroke
    ? ` stroke="${escapePrintSvgAttr(stroke)}" stroke-width="${strokeWidth || 1}"`
    : ''
  const opacityAttr =
    opacity === undefined ? '' : ` opacity="${normalizePrintSvgOpacity(opacity)}"`
  return `<circle cx="${cx}" cy="${cy}" r="${r}"${fillAttr}${strokeAttr}${opacityAttr}/>`
}

