import { CanvasEvent } from '../CanvasEvent'
import { click } from '../handlers/click'
import { contextmenu } from '../handlers/contextmenu'
import { dblclick } from '../handlers/dblclick'
import { drag } from '../handlers/drag'
import { dragover } from '../handlers/dragover'
import { drop } from '../handlers/drop'
import { mouseenter } from '../handlers/mouseenter'
import { mouseleave } from '../handlers/mouseleave'
import { mousemove } from '../handlers/mousemove'
import { mouseout } from '../handlers/mouseout'
import { mouseover } from '../handlers/mouseover'
import { mousedown } from '../handlers/mousedown'
import { mouseup } from '../handlers/mouseup'
import { threeClick } from '../handlers/threeClick'
import { wheel } from '../handlers/wheel'

/**
 * 鼠标事件分发器。
 *
 * 这个类只做事件转发，不承载具体业务，所有鼠标逻辑都拆到独立的 handler 文件里，
 * 这样后续新增点击、拖拽、右键或滚轮能力时，只需要改对应事件模块。
 */
export class PointerController {
  constructor(private readonly host: CanvasEvent) {}

  /** 分发鼠标移动事件。 */
  public mousemove(evt: MouseEvent): void {
    mousemove(evt, this.host)
  }

  /** 分发鼠标按下事件。 */
  public mousedown(evt: MouseEvent): void {
    mousedown(evt, this.host)
  }

  /** 分发单击事件。 */
  public click(evt: MouseEvent): void {
    click(evt, this.host)
  }

  /** 分发鼠标抬起事件。 */
  public mouseup(evt: MouseEvent): void {
    mouseup(evt, this.host)
  }

  /** 分发鼠标离开事件。 */
  public mouseleave(evt: MouseEvent): void {
    mouseleave(evt, this.host)
  }

  /** 分发鼠标悬停事件。 */
  public mouseover(evt: MouseEvent): void {
    mouseover(evt, this.host)
  }

  /** 分发鼠标进入事件。 */
  public mouseenter(evt: MouseEvent): void {
    mouseenter(evt, this.host)
  }

  /** 分发鼠标移出事件。 */
  public mouseout(evt: MouseEvent): void {
    mouseout(evt, this.host)
  }

  /** 分发右键菜单事件。 */
  public contextmenu(evt: MouseEvent): void {
    contextmenu(evt, this.host)
  }

  /** 分发滚轮事件。 */
  public wheel(evt: WheelEvent): void {
    wheel(evt, this.host)
  }

  /** 分发双击事件。 */
  public dblclick(evt: MouseEvent): void {
    dblclick(this.host, evt)
  }

  /** 分发三连击事件。 */
  public threeClick(evt: MouseEvent): void {
    threeClick(this.host, evt)
  }

  /** 分发拖放完成事件。 */
  public drop(evt: DragEvent): void {
    drop(evt, this.host)
  }

  /** 分发原生 drag 事件。 */
  public drag(evt: DragEvent): void {
    drag(evt, this.host)
  }

  /** 分发拖拽悬停事件。 */
  public dragover(evt: DragEvent | MouseEvent): void {
    dragover(evt, this.host)
  }
}
