import { CanvasEvent } from '../CanvasEvent'

/**
 * 处理鼠标进入事件。
 *
 * 这里只保留独立事件模块，不和其他 hover 类逻辑混写。
 */
export function mouseenter(evt: MouseEvent, host: CanvasEvent): void {
  void evt
  void host
}
