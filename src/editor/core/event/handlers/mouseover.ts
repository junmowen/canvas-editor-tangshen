import { CanvasEvent } from '../CanvasEvent'

/**
 * 处理鼠标移入悬停事件。
 *
 * 该事件保留独立模块，不引入额外副作用，便于悬停逻辑集中接入。
 */
export function mouseover(evt: MouseEvent, host: CanvasEvent): void {
  void evt
  void host
}
