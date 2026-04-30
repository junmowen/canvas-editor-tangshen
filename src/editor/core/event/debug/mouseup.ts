import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugMouseup(evt: MouseEvent, host: CanvasEvent, phase = 'before') {
  logPointerEvent(`mouseup:${phase}`, evt, host)
}
