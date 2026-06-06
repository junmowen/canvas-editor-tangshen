import { WatermarkType } from '../../../dataset/enum/Watermark'
import { IEditorOption } from '../../../interface/Editor'
import { IWatermark } from '../../../interface/Watermark'

/** 判断水印配置是否可按 Word 文本水印导出。 */
export function resolveOoxmlTextWatermark(watermark?: IWatermark) {
  if (
    watermark?.data &&
    (!watermark.type || watermark.type === WatermarkType.TEXT)
  ) {
    return watermark
  }
  return undefined
}

/** 判断当前编辑器配置是否包含可导出的文本水印。 */
export function hasOoxmlTextWatermark(options?: IEditorOption) {
  return !!resolveOoxmlTextWatermark(options?.watermark)
}

/** 把水印字号从内部 px 近似换算为 VML 使用的 pt。 */
export function convertOoxmlWatermarkSizeToPoint(size: number | undefined) {
  return Math.max(1, Math.round((size || 0) * 0.75))
}

/** 把水印透明度归一化为 VML fill opacity 百分比。 */
export function createOoxmlWatermarkOpacity(opacity: number | undefined) {
  const normalizedOpacity = Math.max(0, Math.min(1, opacity ?? 0.3))
  return `${Math.round(normalizedOpacity * 100)}%`
}

/** 把页面 px 尺寸换算成 VML 使用的 pt。 */
function convertOoxmlWatermarkPxToPoint(value: number | undefined) {
  return Math.max(1, Math.round((value || 0) * 0.75))
}

/** 估算水印文字宽度，VML 导出阶段没有 Canvas 上下文，只做稳定近似。 */
function measureOoxmlWatermarkTextWidth(text: string, fontSize: number) {
  let width = 0
  for (const char of text) {
    width += /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(char)
      ? fontSize * 1.05
      : fontSize * 0.65
  }
  return width
}

/** 生成文本水印 VML 盒子尺寸，按文字实际尺寸和页面上限共同约束。 */
export function createOoxmlWatermarkShapeMetrics(
  text: string,
  fontSize: number,
  options: IEditorOption
) {
  const pageWidth = convertOoxmlWatermarkPxToPoint(options.width || 794)
  const pageHeight = convertOoxmlWatermarkPxToPoint(options.height || 1123)
  const textWidthUnit = measureOoxmlWatermarkTextWidth(text, 1)
  const maxShapeWidth = pageWidth * 0.98
  const fitFontSize = Math.max(
    1,
    Math.floor(maxShapeWidth / Math.max(1, textWidthUnit + 1.2))
  )
  const effectiveFontSize = Math.min(fontSize, fitFontSize)
  const textWidth = measureOoxmlWatermarkTextWidth(text, effectiveFontSize)
  const width = Math.round(
    Math.min(
      maxShapeWidth,
      Math.max(effectiveFontSize * 2, textWidth + effectiveFontSize * 1.2)
    )
  )
  const height = Math.round(
    Math.min(
      pageHeight * 0.18,
      Math.max(effectiveFontSize * 1.3, effectiveFontSize + 8)
    )
  )
  return {
    width,
    height,
    fontSize: effectiveFontSize,
    left: Math.round((pageWidth - width) / 2),
    top: Math.round((pageHeight - height) / 2)
  }
}
