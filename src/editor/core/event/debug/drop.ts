import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugDrop(evt: DragEvent, host: CanvasEvent) {
  logPointerEvent('drop', evt, host)
}
