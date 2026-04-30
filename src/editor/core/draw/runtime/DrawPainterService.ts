import { IElementStyle } from '../../../interface/Element'
import { IPainterOption } from '../../../interface/Draw'
import type { Draw } from '../Draw'

export class DrawPainterService {
  constructor(private readonly draw: Draw) {}

  public getPainterStyle(): IElementStyle | null {
    const painterStyle = this.draw.getRuntime().getPainterStyle()
    return painterStyle && Object.keys(painterStyle).length ? painterStyle : null
  }

  public setPainterStyle(payload: IElementStyle | null, options?: IPainterOption) {
    this.draw.getRuntime().replacePainterState(payload, options || null)
    if (this.getPainterStyle()) {
      this.draw.getPageCanvasHost().setBaseCursor('copy')
    }
  }

  public setDefaultRange() {
    if (!this.draw.getOriginalMainElementList().length) return
    setTimeout(() => {
      const curIndex = this.draw.getOriginalMainElementList().length - 1
      this.draw.getRange().setRange(curIndex, curIndex)
      this.draw.getRange().setRangeStyle()
    })
  }
}
