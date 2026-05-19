import { CanvasEvent } from '../CanvasEvent'
import { debugContextmenu } from '../debug/contextmenu'

/**
 * 处理右键菜单事件。
 *
 * 当前阶段先保留独立入口并记录调试信息，后续可以按功能再拆成菜单、命中和权限检查。
 */
export function contextmenu(evt: MouseEvent, host: CanvasEvent): void {
  debugContextmenu(evt, host)
}
