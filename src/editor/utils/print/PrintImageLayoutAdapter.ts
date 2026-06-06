import { PaperDirection } from '../../dataset/enum/Editor'
import { convertPxToPaperSize } from './shared'

/** 解析图片打印页面的纸张和图片尺寸。 */
export function resolvePrintImageLayout(payload: {
  width: number
  height: number
  direction: PaperDirection
}) {
  const paperSize = convertPxToPaperSize(payload.width, payload.height)
  const isHorizontal = payload.direction === PaperDirection.HORIZONTAL
  return {
    paperSize,
    imageWidth: isHorizontal ? paperSize.height : paperSize.width,
    imageHeight: isHorizontal ? paperSize.width : paperSize.height,
    pageOrientation: isHorizontal ? 'landscape' : 'portrait'
  }
}
