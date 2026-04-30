import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugMousemove(evt: MouseEvent, host: CanvasEvent, phase = 'before') {
  logPointerEvent(`mousemove:${phase}`, evt, host)
}
