import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'

/** 判断当前元素是否是内联图片展示模式。 */
export function isInlineImageElement(element: IElement | undefined) {
  return element?.imgDisplay === ImageDisplay.INLINE
}

/** 判断当前元素是否是图片元素。 */
export function isImageElement(element: IElement | undefined) {
  return element?.type === ElementType.IMAGE
}

/** 图片行内测量器。 */
export class InlineImageElementLayout {
  public measure(payload: {
    element: IElement
    metrics: IElementMetrics
    availableWidth: number
    scale: number
  }) {
    const { element, metrics, availableWidth, scale } = payload
    if (
      !isImageElement(element)
    ) {
      return false
    }
    if (
      element.imgDisplay === ImageDisplay.SURROUND ||
      element.imgDisplay === ImageDisplay.TIGHT ||
      element.imgDisplay === ImageDisplay.FLOAT_TOP ||
      element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
    ) {
      metrics.width = 0
      metrics.height = 0
      metrics.boundingBoxDescent = 0
    } else {
      const elementWidth = element.width! * scale
      const elementHeight = element.height! * scale
      if (elementWidth > availableWidth) {
        const adaptiveHeight = (elementHeight * availableWidth) / elementWidth
        metrics.width = availableWidth
        metrics.height = adaptiveHeight
        metrics.boundingBoxDescent = adaptiveHeight
      } else {
        metrics.width = elementWidth
        metrics.height = elementHeight
        metrics.boundingBoxDescent = elementHeight
      }
    }
    metrics.boundingBoxAscent = 0
    return true
  }
}
