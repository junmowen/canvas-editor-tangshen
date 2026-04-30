import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugMouseleave(evt: MouseEvent, host: CanvasEvent) {
  logPointerEvent('mouseleave', evt, host)
}
