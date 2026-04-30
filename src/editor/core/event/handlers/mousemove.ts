import { CanvasEvent } from '../CanvasEvent'
import { runDragHoverIntent } from '../pointer/intents/drag-drop/DragHoverIntent'
import { runSelectionDragIntent } from '../pointer/intents/selection/SelectionDragIntent'

/**
 * 处理鼠标移动事件。
 *
 * 处理拖拽、选区扩展、页面切换等逻辑。
 *
 * @param evt - 鼠标事件
 * @param host - Canvas 事件主机
 */
export function mousemove(evt: MouseEvent, host: CanvasEvent) {
  const session = host.getPointerSession()
  if (session.isAllowDrag) {
    runDragHoverIntent({ host, evt })
    return
  }
  runSelectionDragIntent({ host, evt })
}
