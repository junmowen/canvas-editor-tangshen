import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'

/** 判断当前元素是否是分页符。 */
export function isPageBreakElement(element: IElement | undefined) {
  return element?.type === ElementType.PAGE_BREAK
}

/** 分页符元素测量器。 */
export class PageBreakElementLayout {
  public measure(payload: {
    element: IElement
    metrics: IElementMetrics
    availableWidth: number
    scale: number
    defaultSize: number
  }) {
    const { element, metrics, availableWidth, scale, defaultSize } = payload
    if (!isPageBreakElement(element)) return false
    element.width = availableWidth / scale
    metrics.width = availableWidth
    metrics.height = defaultSize
    return true
  }
}
