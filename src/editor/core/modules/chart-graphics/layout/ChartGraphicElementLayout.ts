import { IElement, IElementMetrics } from '../../../../interface/Element'
import { isChartGraphicElement } from '../utils/ChartGraphicUtils'

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
