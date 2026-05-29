import { CanvasEvent } from '../CanvasEvent'

export class PointerSessionController {
  /** 初始化 PointerSessionController 实例并注入运行依赖。 */
  constructor(private readonly host: CanvasEvent) {}

  public clearSelection() {
    const session = this.host.getPointerSession()
    session.isAllowSelection = false
    session.mouseDownStartPosition = null
    session.mouseDownStartCoordinates = null
    this.host.applyPainterStyle()
  }

  public clearDrag() {
    const session = this.host.getPointerSession()
    session.isAllowDrag = false
    session.isAllowDrop = false
    session.lastPointerCoordinates = null
    session.dragSnapshot = {
      range: null,
      elementList: null,
      positionList: null,
      positionContext: null
    }
  }
}
