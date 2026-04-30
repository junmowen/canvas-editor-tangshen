import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugMouseover(evt: MouseEvent, host: CanvasEvent) {
  logPointerEvent('mouseover', evt, host)
}
