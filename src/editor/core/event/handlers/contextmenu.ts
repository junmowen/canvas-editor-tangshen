import { CanvasEvent } from '../CanvasEvent'
import { debugContextmenu } from '../debug/contextmenu'

/**
 * 处理右键菜单事件。
 *
 * 独立入口负责收敛右键调试信息，菜单、命中和权限检查由下游模块处理。
 */
export function contextmenu(evt: MouseEvent, host: CanvasEvent): void {
  debugContextmenu(evt, host)
}
