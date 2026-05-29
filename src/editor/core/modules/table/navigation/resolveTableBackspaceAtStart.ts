import { ZERO } from '../../../../dataset/constant/Common'
import { IElement } from '../../../../interface/Element'
import { IPositionContext } from '../../../../interface/Position'
import { Draw } from '../../../draw/Draw'

/** 解析表格片段开头 Backspace 是否应跳回上一片段末尾。 */
export function resolveTableBackspaceAtStart(payload: {
  /** 绘制核心实例，提供表格导航服务。 */
  draw: Draw
  /** 当前片段第一个元素。 */
  firstElement: IElement
  /** 当前命中位置上下文。 */
  positionContext: IPositionContext
}) {
  const { draw, firstElement, positionContext } = payload
  if (!positionContext.isTable || !firstElement.tableId) return null
  const navigationResult =
    draw.getComponents().tableNavigationService.resolveBackspaceNavigation({
      positionContext
    })
  if (!navigationResult) return null
  return {
    ...navigationResult,
    shouldRemoveFirstElement: firstElement.value !== ZERO
  }
}
