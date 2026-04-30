import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugContextmenu(evt: MouseEvent, host: CanvasEvent) {
  logPointerEvent('contextmenu', evt, host)
}
