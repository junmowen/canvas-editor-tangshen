import { ImageDisplay } from '../../../../../dataset/enum/Common'
import { ElementType } from '../../../../../dataset/enum/Element'
import { CanvasEvent } from '../../../CanvasEvent'
import { drawDragCursor } from '../../effects/DragEffect'

export function applyDragCursorIntent(payload: {
  host: CanvasEvent
  positionContext: any
}) {
  const { host, positionContext } = payload
  const draw = host.getDraw()
  const session = host.getPointerSession()
  const position = draw.getComponents().position
  const { isTable, tdValueIndex, index } = positionContext
  const positionList = position.getPositionList()
  const curIndex = isTable ? tdValueIndex! : index
  if (~index) {
    const rangeManager = draw.getComponents().range
    rangeManager.setRange(curIndex, curIndex)
    position.setCursorPosition(positionList[curIndex])
  }
  const {
    cursor: { dragColor, dragWidth, dragFloatImageDisabled }
  } = draw.getOptions()
  if (dragFloatImageDisabled) {
    const dragElement =
      session.dragSnapshot.elementList?.[session.dragSnapshot.range!.startIndex]
    if (
      dragElement?.type === ElementType.IMAGE &&
      (dragElement.imgDisplay === ImageDisplay.FLOAT_TOP ||
        dragElement.imgDisplay === ImageDisplay.FLOAT_BOTTOM ||
        dragElement.imgDisplay === ImageDisplay.SURROUND)
    ) {
      return
    }
  }
  drawDragCursor({ draw, dragColor, dragWidth })
}
