import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'

/** 判断当前元素是否是图表图形。 */
export function isChartGraphicElement(
  element: IElement | undefined | null
): element is IElement & { chartGraphic: NonNullable<IElement['chartGraphic']> } {
  return element?.type === ElementType.CHART_GRAPHIC && !!element.chartGraphic
}

/** 图表图形元素测量器。 */
export class ChartGraphicElementLayout {
  public measure(payload: {
    element: IElement
    metrics: IElementMetrics
    availableWidth: number
    scale: number
  }) {
    const { element, metrics, availableWidth, scale } = payload
    if (!isChartGraphicElement(element)) return false
    const chartSize = element.chartGraphic.size
    const sourceWidth = element.width || chartSize.width
    const sourceHeight = element.height || chartSize.height
    const width = sourceWidth * scale
    const height = sourceHeight * scale
    if (width > availableWidth) {
      metrics.width = availableWidth
      metrics.height = (height * availableWidth) / width
    } else {
      metrics.width = width
      metrics.height = height
    }
    metrics.boundingBoxAscent = 0
    metrics.boundingBoxDescent = metrics.height
    return true
  }
}
