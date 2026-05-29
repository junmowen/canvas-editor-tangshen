import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'
import type { Draw } from '../../../draw/Draw'

/** 判断当前元素是否是分隔符。 */
export function isSeparatorElement(element: IElement | undefined) {
  return element?.type === ElementType.SEPARATOR
}

/** 分隔符元素测量器。 */
export class SeparatorElementLayout {
  /** 初始化 SeparatorElementLayout 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  public measure(payload: {
    element: IElement
    metrics: IElementMetrics
    availableWidth: number
    rowMargin: number
    scale: number
  }) {
    const { element, metrics, availableWidth, rowMargin, scale } = payload
    if (!isSeparatorElement(element)) return false
    const {
      separator: { lineWidth }
    } = this.draw.getOptions()
    element.width = availableWidth / scale
    metrics.width = availableWidth
    metrics.height = lineWidth * scale
    metrics.boundingBoxAscent = -rowMargin
    metrics.boundingBoxDescent = -rowMargin + metrics.height
    return true
  }
}
