import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugMouseout(evt: MouseEvent, host: CanvasEvent) {
  logPointerEvent('mouseout', evt, host)
}
