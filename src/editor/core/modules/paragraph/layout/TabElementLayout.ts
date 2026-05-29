import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'

/** 判断当前元素是否是 Tab。 */
export function isTabElement(element: IElement | undefined) {
  return element?.type === ElementType.TAB
}

/** Tab 元素测量器。 */
export class TabElementLayout {
  public measure(payload: {
    element: IElement
    metrics: IElementMetrics
    scale: number
    defaultSize: number
    defaultTabWidth: number
  }) {
    const { element, metrics, scale, defaultSize, defaultTabWidth } = payload
    if (!isTabElement(element)) return false
    metrics.width = defaultTabWidth * scale
    metrics.height = defaultSize * scale
    metrics.boundingBoxDescent = 0
    metrics.boundingBoxAscent = metrics.height
    return true
  }
}
