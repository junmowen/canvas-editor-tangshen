import { CanvasEvent } from '../CanvasEvent'
import { debugDragover } from '../debug/dragover'
import { applyDragCursorIntent } from '../pointer/intents/drag-drop/ApplyDragCursorIntent'
import { resolveDragPointerIntent } from '../pointer/intents/drag-drop/ResolveDragPointerIntent'
import { shouldResolveDragoverPointer } from '../pointer/policy/DragoverPointerPolicy'

/**
 * 处理拖拽悬停事件。
 *
 * 该模块只负责拖拽过程中的实时定位和光标样式更新，避免和真正的 drop 逻辑耦合。
 */
export function dragover(evt: DragEvent | MouseEvent, host: CanvasEvent): void {
  debugDragover(evt, host)
  const session = host.getPointerSession()
  if (!shouldResolveDragoverPointer(evt, host)) return

  const dragPointer = resolveDragPointerIntent({ host, evt })
  if (!dragPointer) return
  session.lastPointerCoordinates = dragPointer.coordinates
  const { positionResult: positionContext } = dragPointer
  applyDragCursorIntent({ host, positionContext })
}
