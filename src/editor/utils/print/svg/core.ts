import { NumberType } from '../../../dataset/enum/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { IElementPosition } from '../../../interface/Element'
import { IMargin } from '../../../interface/Margin'
import { convertNumberToChinese } from '../../index'
import { IPrintSvgDocumentPayload, IPrintSvgPageMetric } from './types'
export function escapePrintSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 转义 SVG 属性值，图片地址和 path 数据都统一走属性转义。 */
export function escapePrintSvgAttr(value: string) {
  return escapePrintSvgText(value)
}

/** 把透明度归一到 SVG 可接受范围。 */
export function normalizePrintSvgOpacity(opacity?: number) {
  if (opacity === undefined || Number.isNaN(opacity)) return 1
  return Math.min(1, Math.max(0, opacity))
}

/** 计算 SVG 文本基线偏移，保持上下标和 worker/Canvas 渲染一致。 */
export function resolvePrintSvgInlineTextOffsetY(position: IElementPosition) {
  const element = position.element
  if (element?.type === ElementType.SUPERSCRIPT) {
    return -position.metrics.height / 2
  }
  if (element?.type === ElementType.SUBSCRIPT) {
    return position.metrics.height / 2
  }
  // 正数 textPosition 在 Word 语义里表示上移，这里转换为 SVG y 轴负向偏移。
  if (typeof element?.textPosition === 'number') {
    return -element.textPosition
  }
  return 0
}

/** 使用浏览器文本测量计算页码等整体文本宽度。 */
export function measurePrintSvgTextWidth(text: string, font: string) {
  if (typeof document === 'undefined') {
    return text.length * 12
  }
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return text.length * 12
  ctx.font = font
  return ctx.measureText(text).width
}

/** 格式化数字，保持页码和水印占位符与编辑器渲染一致。 */
export function formatPrintSvgNumber(value: number, numberType?: NumberType) {
  return numberType === NumberType.CHINESE
    ? convertNumberToChinese(value)
    : `${value}`
}

/** 替换页码或水印中的页码占位符。 */
export function replacePrintSvgNumberPlaceholder(
  text: string,
  placeholder: string,
  value: number,
  numberType?: NumberType
) {
  return text.replace(
    new RegExp(placeholder),
    formatPrintSvgNumber(value, numberType)
  )
}

/** 读取指定页的布局指标，没有显式传入时使用 options 默认值。 */
export function getPrintSvgPageMetric(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
): IPrintSvgPageMetric {
  const defaultMargins = (payload.editorOptions?.margins || [
    0,
    0,
    0,
    0
  ]) as IMargin
  return (
    payload.pageMetricList?.[pageNo] || {
      margins: defaultMargins,
      innerWidth: payload.width - defaultMargins[1] - defaultMargins[3],
      headerExtraHeight: 0,
      footerExtraHeight: 0
    }
  )
}

/** 判断当前页是否允许绘制带页码范围的背景或装饰。 */
export function isPrintSvgPageApplied(applyPageNumbers: number[] | undefined, pageNo: number) {
  return !applyPageNumbers?.length || applyPageNumbers.includes(pageNo)
}

