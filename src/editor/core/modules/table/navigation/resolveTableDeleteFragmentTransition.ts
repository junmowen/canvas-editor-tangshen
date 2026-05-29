import { IPositionContext } from '../../../../interface/Position'
import { Draw } from '../../../draw/Draw'

/** Delete 跨表格片段时解析最终光标索引。 */
export function resolveTableDeleteFragmentTransition(payload: {
  /** 绘制核心实例，提供表格导航服务。 */
  draw: Draw
  /** 当前命中位置上下文。 */
  positionContext: IPositionContext
  /** 当前光标索引。 */
  cursorIndex: number
}) {
  const { draw, positionContext, cursorIndex } = payload
  return (
    draw.getComponents().tableNavigationService.resolveFragmentTransitionIndex({
      positionContext,
      cursorIndex,
      direction: 'next'
    }) ?? cursorIndex
  )
}
