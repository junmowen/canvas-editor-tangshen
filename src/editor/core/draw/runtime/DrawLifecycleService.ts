import type { Draw } from '../Draw'

export class DrawLifecycleService {
  constructor(private readonly draw: Draw) {}

  public destroy() {
    this.draw.getServices().renderInvalidationManager.reset()
    this.draw.getPageCanvasHost().getContainer().remove()
    this.draw.getComponents().globalEvent.removeEvent()
    this.draw.getComponents().scrollObserver.removeEvent()
    this.draw.getComponents().selectionObserver.removeEvent()
  }

  public clearSideEffect() {
    this.draw.getComponents().previewer.clearResizer()
    this.draw.getComponents().tableTool.dispose()
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    this.draw.getDateParticle().clearDatePicker()
  }
}
