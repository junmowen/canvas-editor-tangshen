import { PaperDirection } from '../../../dataset/enum/Editor'
import { convertPxToPaperSize } from '../shared'

/** 解析 SVG 打印页面的浏览器 CSS 尺寸和页面容器尺寸。 */
export function resolvePrintSvgPageLayout(payload: {
  width: number
  height: number
  direction?: PaperDirection
}) {
  const { width, height, direction = PaperDirection.VERTICAL } = payload
  const paperSize = convertPxToPaperSize(width, height)
  const isHorizontal = direction === PaperDirection.HORIZONTAL
  const orientation = isHorizontal ? 'landscape' : 'portrait'
  const pageWidth = isHorizontal ? paperSize.height : paperSize.width
  const pageHeight = isHorizontal ? paperSize.width : paperSize.height
  return {
    paperSize,
    pageWidth,
    pageHeight,
    pageCssSize: paperSize.size
      ? `${paperSize.size} ${orientation}`
      : `${pageWidth} ${pageHeight}`
  }
}
