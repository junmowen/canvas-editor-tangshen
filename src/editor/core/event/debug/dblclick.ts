import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugDblclick(evt: MouseEvent, host: CanvasEvent) {
  logPointerEvent('dblclick', evt, host)
}
