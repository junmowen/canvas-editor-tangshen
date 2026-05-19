import { CanvasEvent } from '../CanvasEvent'
import { debugDrag } from '../debug/drag'

/**
 * 处理原生 drag 事件。
 *
 * 当前只保留独立模块和调试记录，真正的拖拽命中与落点逻辑在 dragover / drop 中处理。
 */
export function drag(evt: DragEvent, host: CanvasEvent): void {
  debugDrag(evt, host)
}
