import { isIOS } from '../../../utils/ua'
import { CanvasEvent } from '../CanvasEvent'
import { debugClick } from '../debug/click'

/**
 * 处理单击事件。
 *
 * 单击本身不直接改写文档，只负责清理双击计时器，并在 iOS 上补一次焦点。
 */
export function click(evt: MouseEvent, host: CanvasEvent): void {
  debugClick(evt, host)
  const draw = host.getDraw()
  if (evt.detail === 1) {
    const { multiClick } = host.getPointerSession()
    if (multiClick.tableCellClickResetTimer !== null) {
      window.clearTimeout(multiClick.tableCellClickResetTimer)
    }
    multiClick.tableCellClickResetTimer = window.setTimeout(() => {
      multiClick.lastTableCellDblclickInfo = null
      multiClick.tableCellDblclickCount = 0
      multiClick.tableCellClickResetTimer = null
    }, 250)
  }

  if (isIOS && !draw.isReadonly()) {
    draw.getCursor().getAgentDom().focus()
  }
}
