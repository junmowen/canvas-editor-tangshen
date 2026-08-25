import { ElementType } from '../../../../dataset/enum/Element'
import { IChartGraphic } from '../model/ChartGraphic'
import { IElement } from '../../../../interface/Element'
import { findCommandElementList } from '../../../command/CommandElementTraversal'
import type { Draw } from '../../../draw/Draw'

/** 按元素 id 返回当前文档主模型里的实时图表元素引用。 */
export function findChartGraphicElementById(
  draw: Draw,
  elementId: string
): (IElement & { chartGraphic: IChartGraphic }) | null {
  for (const context of draw.getObjectResolver().getOriginalZoneElementList()) {
    const element = findCommandElementList<
      IElement & { chartGraphic: IChartGraphic }
    >({
        elementList: context.elementList,
        isIncludeValueList: true,
        visitor: ({ element }) => {
          if (
            element.id === elementId &&
            element.type === ElementType.CHART_GRAPHIC &&
            element.chartGraphic
          ) {
            return element as IElement & { chartGraphic: IChartGraphic }
          }
          return null
        }
      })
    if (element) {
      return element
    }
  }
  return null
}
