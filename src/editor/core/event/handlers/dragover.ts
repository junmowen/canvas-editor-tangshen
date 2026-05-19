import { findParent } from '../../../utils'
import { CanvasEvent } from '../CanvasEvent'
import { debugDragover } from '../debug/dragover'
import { applyDragCursorIntent } from '../pointer/intents/drag-drop/ApplyDragCursorIntent'
import { resolveDragPointerIntent } from '../pointer/intents/drag-drop/ResolveDragPointerIntent'

/**
 * 处理拖拽悬停事件。
 *
 * 该模块只负责拖拽过程中的实时定位和光标样式更新，避免和真正的 drop 逻辑耦合。
 */
export function dragover(evt: DragEvent | MouseEvent, host: CanvasEvent): void {
  debugDragover(evt, host)
  const draw = host.getDraw()
  const session = host.getPointerSession()
  if (draw.isReadonly()) return

  evt.preventDefault()

  // 非编辑器页面容器区域不处理拖拽定位。
  const pageContainer = draw.getPageCanvasHost().getPageContainer()
  const editorRegion = findParent(
    evt.target as Element,
    (node: Element) => node === pageContainer,
    true
  )
  if (!editorRegion) return

  const dragPointer = resolveDragPointerIntent({ host, evt })
  if (!dragPointer) return
  session.lastPointerCoordinates = dragPointer.coordinates
  const { positionResult: positionContext } = dragPointer
  applyDragCursorIntent({ host, positionContext })
}
