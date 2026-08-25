import { CanvasEvent } from '../CanvasEvent'
import { debugMouseup } from '../debug/mouseup'
import { commitChartGraphicDragIntent } from '../pointer/intents/chart-graphics/ChartGraphicDragIntent'
import { runDragCommitIntent } from '../pointer/intents/drag-drop/DragCommitIntent'
import { replayMousedownAfterUncommittedDrag } from '../pointer/policy/DragMouseupRecoveryPolicy'

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
    const coordinates = draw.getCoordinate().getPointerCoordinates(evt, session.lastPointerCoordinates)
    session.lastPointerCoordinates = coordinates
    if (commitChartGraphicDragIntent({ host, evt })) return
    if (runDragCommitIntent({ host, evt, coordinates })) return
    replayMousedownAfterUncommittedDrag({ host, evt })
  } finally {
    debugMouseup(evt, host, 'after')
  }
}
