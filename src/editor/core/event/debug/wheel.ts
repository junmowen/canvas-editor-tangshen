import { CanvasEvent } from '../CanvasEvent'
import { logPointerEvent } from './logPointerEvent'

export function debugWheel(evt: WheelEvent, host: CanvasEvent) {
  logPointerEvent('wheel', evt, host)
}
