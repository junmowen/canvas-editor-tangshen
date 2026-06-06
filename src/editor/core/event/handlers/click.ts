import { CanvasEvent } from '../CanvasEvent'
import { debugClick } from '../debug/click'
import {
  focusIOSInputAdapter,
  scheduleTableCellClickReset
} from '../pointer/policy/ClickInteractionPolicy'

/**
 * 处理单击事件。
 *
 * 单击本身不直接改写文档，只负责清理双击计时器，并在 iOS 上补一次焦点。
 */
export function click(evt: MouseEvent, host: CanvasEvent): void {
  debugClick(evt, host)
  scheduleTableCellClickReset(host, evt)
  focusIOSInputAdapter(host)
}
