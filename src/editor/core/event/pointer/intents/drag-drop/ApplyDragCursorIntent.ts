import { CanvasEvent } from '../../../CanvasEvent'
import { drawDragCursor } from '../../effects/DragEffect'
import { resolvePositionAtIndex } from '../../../../position/utils/resolvePositionAtIndex'
import { resolveTableAwarePointerIndex } from '../../../../modules/table/selection/resolveTablePointerIndex'
import { shouldSkipDragCursorForFloatingImage } from '../../../../modules/image/interaction/ImageDragInteraction'

export function applyDragCursorIntent(payload: {
  /** 宿主容器节点，用于承载编辑器或渲染表面。 */
  host: CanvasEvent
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: any
}) {
  const { host, positionContext } = payload
  const draw = host.getDraw()
  const session = host.getPointerSession()
  const coordinate = draw.getCoordinate()
  const { index } = positionContext
  const curIndex = resolveTableAwarePointerIndex(positionContext)
  if (~index) {
    const rangeManager = draw.getComponents().range
    rangeManager.setRange(curIndex, curIndex)
    coordinate.setCursorPosition(resolvePositionAtIndex(draw, curIndex))
  }
  const {
    cursor: { dragColor, dragWidth, dragFloatImageDisabled }
  } = draw.getOptions()
  if (dragFloatImageDisabled) {
    const dragElement =
      session.dragSnapshot.elementList?.[session.dragSnapshot.range!.startIndex]
    if (shouldSkipDragCursorForFloatingImage({
      dragFloatImageDisabled,
      element: dragElement
    })) {
      return
    }
  }
  drawDragCursor({ draw, dragColor, dragWidth })
}
