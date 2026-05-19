import { CanvasEvent } from '../CanvasEvent'
import { debugWheel } from '../debug/wheel'

/**
 * 处理滚轮事件。
 *
 * 这里先单独隔离滚轮入口，避免后续缩放、滚动和惯性逻辑混在同一个控制器里。
 */
export function wheel(evt: WheelEvent, host: CanvasEvent): void {
  debugWheel(evt, host)
}
