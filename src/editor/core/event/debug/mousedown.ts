import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugMousedown(evt: MouseEvent, host: CanvasEvent, phase = 'before') {
  logPointerEvent(`mousedown:${phase}`, evt, host)
}
