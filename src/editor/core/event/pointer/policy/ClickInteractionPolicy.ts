import { isIOS } from '../../../../utils/ua'
import { CanvasEvent } from '../../CanvasEvent'

export function scheduleTableCellClickReset(host: CanvasEvent, evt: MouseEvent): void {
  if (evt.detail !== 1) return
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

export function focusIOSInputAdapter(host: CanvasEvent): void {
  const draw = host.getDraw()
  if (isIOS && !draw.isReadonly()) {
    draw.getCursor().getAgentDom().focus()
  }
}
