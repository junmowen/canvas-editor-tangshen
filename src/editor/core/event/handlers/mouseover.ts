import { CanvasEvent } from '../CanvasEvent'

/**
 * 处理鼠标移入悬停事件。
 *
 * 当前阶段这个事件只保留独立模块，不引入额外副作用，方便后续单独挂接高亮或提示逻辑。
 */
export function mouseover(evt: MouseEvent, host: CanvasEvent): void {
  void evt
  void host
}
