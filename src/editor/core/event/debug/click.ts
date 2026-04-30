import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugClick(evt: MouseEvent, host: CanvasEvent) {
  logPointerEvent('click', evt, host)
}
