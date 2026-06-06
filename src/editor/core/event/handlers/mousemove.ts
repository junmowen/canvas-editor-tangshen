import { CanvasEvent } from '../CanvasEvent'
import { dispatchPointerMoveIntent } from '../pointer/policy/PointerMoveDispatchPolicy'

/**
 * 处理鼠标移动事件。
 *
 * 处理拖拽、选区扩展、页面切换等逻辑。
 *
 * @param evt - 鼠标事件
 * @param host - Canvas 事件主机
 */
export function mousemove(evt: MouseEvent, host: CanvasEvent) {
  dispatchPointerMoveIntent({ host, evt })
}
