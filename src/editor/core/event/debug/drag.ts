import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugDrag(evt: DragEvent, host: CanvasEvent) {
  logPointerEvent('drag', evt, host)
}
