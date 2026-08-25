import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

export type IChartGraphicElement = IElement & {
  chartGraphic: NonNullable<IElement['chartGraphic']>
}

/** 判断元素是否为带有有效模型的图表图形元素。 */
export function isChartGraphicElement(
  element: IElement | undefined | null
): element is IChartGraphicElement {
  return element?.type === ElementType.CHART_GRAPHIC && !!element.chartGraphic
}

/** 获取图表元素当前用于渲染的逻辑尺寸。 */
export function resolveChartGraphicElementSize(element: IChartGraphicElement) {
  return {
    width: element.width || element.chartGraphic.size.width,
    height: element.height || element.chartGraphic.size.height
  }
}