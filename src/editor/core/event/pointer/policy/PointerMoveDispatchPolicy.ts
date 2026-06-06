import { CanvasEvent } from '../../CanvasEvent'
import { runDragHoverIntent } from '../intents/drag-drop/DragHoverIntent'
import { runSelectionDragIntent } from '../intents/selection/SelectionDragIntent'

export function dispatchPointerMoveIntent(payload: {
  host: CanvasEvent
  evt: MouseEvent
}): void {
  const { host, evt } = payload
  const session = host.getPointerSession()
  if (session.isAllowDrag) {
    runDragHoverIntent({ host, evt })
    return
  }
  runSelectionDragIntent({ host, evt })
}
