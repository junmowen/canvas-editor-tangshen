import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugMouseenter(evt: MouseEvent, host: CanvasEvent) {
  logPointerEvent('mouseenter', evt, host)
}
