import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent, TPointerDebugEvent } from './logPointerEvent'

export function debugDragover(evt: TPointerDebugEvent, host: CanvasEvent) {
  logPointerEvent('dragover', evt, host)
}
