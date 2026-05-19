import { CanvasEvent } from '../CanvasEvent'
import { debugMouseup } from '../debug/mouseup'
import { runDragCommitIntent } from '../pointer/intents/drag-drop/DragCommitIntent'

/**
 * 处理鼠标抬起事件。
 *
 * 处理拖拽释放、选区结束等逻辑。
 *
 * @param evt - 鼠标事件
 * @param host - Canvas 事件主机
 */
export function mouseup(evt: MouseEvent, host: CanvasEvent) {
  debugMouseup(evt, host)
  try {
    const draw = host.getDraw()
    const session = host.getPointerSession()
    const coordinates = draw.getPointerCoordinates(evt, session.lastPointerCoordinates)
    session.lastPointerCoordinates = coordinates
    if (runDragCommitIntent({ host, evt, coordinates })) return
    if (session.isAllowDrag) {
      // 兜底处理拖拽结束但仍停留在 drag 状态的异常分支。
      if (session.dragSnapshot.range?.startIndex !== session.dragSnapshot.range?.endIndex) {
        host.mousedown(evt)
      }
    }
  } finally {
    debugMouseup(evt, host, 'after')
  }
}
