import { isIOS } from '../../../utils/ua'
import { CanvasEvent } from '../CanvasEvent'
import { debugClick } from '../debug/click'
import { debugContextmenu } from '../debug/contextmenu'
import { debugDblclick } from '../debug/dblclick'
import { debugDrag } from '../debug/drag'
import { debugDragover } from '../debug/dragover'
import { debugDrop } from '../debug/drop'
import { debugMousedown } from '../debug/mousedown'
import { debugMouseup } from '../debug/mouseup'
import { debugWheel } from '../debug/wheel'
import click from '../handlers/click'
import drag from '../handlers/drag'
import { drop } from '../handlers/drop'
import { mousedown } from '../handlers/mousedown'
import { mouseleave } from '../handlers/mouseleave'
import { mousemove } from '../handlers/mousemove'
import { mouseup } from '../handlers/mouseup'

export class PointerController {
  constructor(private readonly host: CanvasEvent) {}

  public mousemove(evt: MouseEvent) {
    mousemove(evt, this.host)
  }

  public mousedown(evt: MouseEvent) {
    debugMousedown(evt, this.host)
    mousedown(evt, this.host)
    debugMousedown(evt, this.host, 'after')
  }

  public click(evt: MouseEvent) {
    debugClick(evt, this.host)
    if (evt.detail === 1) {
      const { multiClick } = this.host.getPointerSession()
      if (multiClick.tableCellClickResetTimer !== null) {
        window.clearTimeout(multiClick.tableCellClickResetTimer)
      }
      multiClick.tableCellClickResetTimer = window.setTimeout(() => {
        multiClick.lastTableCellDblclickInfo = null
        multiClick.tableCellDblclickCount = 0
        multiClick.tableCellClickResetTimer = null
      }, 250)
    }
    if (isIOS && !this.host.getDraw().isReadonly()) {
      this.host.getDraw().getCursor().getAgentDom().focus()
    }
  }

  public mouseup(evt: MouseEvent) {
    debugMouseup(evt, this.host)
    mouseup(evt, this.host)
    debugMouseup(evt, this.host, 'after')
  }

  public mouseleave(evt: MouseEvent) {
    mouseleave(evt, this.host)
  }

  public mouseover(evt: MouseEvent) {
    void evt
  }

  public mouseenter(evt: MouseEvent) {
    void evt
  }

  public mouseout(evt: MouseEvent) {
    void evt
  }

  public contextmenu(evt: MouseEvent) {
    debugContextmenu(evt, this.host)
  }

  public wheel(evt: WheelEvent) {
    debugWheel(evt, this.host)
  }

  public dblclick(evt: MouseEvent) {
    debugDblclick(evt, this.host)
    click.dblclick(this.host, evt)
  }

  public threeClick(evt: MouseEvent) {
    click.threeClick(this.host, evt)
  }

  public drop(evt: DragEvent) {
    debugDrop(evt, this.host)
    drop(evt, this.host)
  }

  public drag(evt: DragEvent) {
    debugDrag(evt, this.host)
  }

  public dragover(evt: DragEvent | MouseEvent) {
    debugDragover(evt, this.host)
    drag.dragover(evt, this.host)
  }
}
