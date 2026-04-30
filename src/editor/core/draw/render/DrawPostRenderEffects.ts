import { IDrawOption } from '../../../interface/Draw'
import type { Draw } from '../Draw'

export class DrawPostRenderEffects {
  constructor(private readonly draw: Draw) {}

  public run(
    payload: Required<Pick<IDrawOption, 'isCompute' | 'isSubmitHistory' | 'isSourceHistory' | 'isInit'>>,
    oldPageSize: number
  ) {
    this.draw.getComponents().range.setRangeStyle()

    if (payload.isCompute && this.draw.getComponents().control.getActiveControl()) {
      this.draw.getComponents().control.reAwakeControl()
    }

    if (
      payload.isCompute &&
      !this.draw.isReadonly() &&
      this.draw.getComponents().position.getPositionContext().isTable
    ) {
      this.draw.getComponents().tableTool.render()
    }

    if (payload.isCompute && !this.draw.getComponents().zone.isMainActive()) {
      this.draw.getComponents().zone.drawZoneIndicator()
    }

    if (oldPageSize !== this.draw.getPageRowList().length) {
      const pageSizeChange = this.draw.getListener().pageSizeChange
      if (pageSizeChange) {
        pageSizeChange(this.draw.getPageRowList().length)
      }
      if (this.draw.getEventBus().isSubscribe('pageSizeChange')) {
        this.draw.getEventBus().emit('pageSizeChange', this.draw.getPageRowList().length)
      }
    }

    if ((payload.isSubmitHistory || payload.isSourceHistory) && !payload.isInit) {
      const contentChange = this.draw.getListener().contentChange
      if (contentChange) {
        contentChange()
      }
      if (this.draw.getEventBus().isSubscribe('contentChange')) {
        this.draw.getEventBus().emit('contentChange')
      }
    }
  }
}
