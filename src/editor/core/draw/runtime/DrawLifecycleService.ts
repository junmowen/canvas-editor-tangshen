import type { Draw } from '../Draw'

/** Draw 生命周期服务，集中释放定时器、画布和全局事件。 */
export class DrawLifecycleService {
  /** 关联的 Draw 聚合根。 */
  constructor(private readonly draw: Draw) {}

  /** 销毁编辑器实例并清理所有异步副作用。 */
  public destroy() {
    this.draw.getServices().pageRenderer.cancelPendingBitmapCache()
    this.draw.getServices().workerRenderScheduler.dispose()
    this.draw.getImageParticle().clearPreviewBitmapCache()
    this.draw.getServices().historyBridge.cancelTypingHistory()
    this.draw.getServices().renderInvalidationManager.reset()
    this.draw.getPageCanvasHost().dispose()
    this.draw.getPageCanvasHost().getContainer().remove()
    this.draw.getComponents().globalEvent.removeEvent()
    this.draw.getComponents().scrollObserver.removeEvent()
    this.draw.getComponents().selectionObserver.removeEvent()
  }

  /** 清理浮层、预览器和控件等可重复进入的临时副作用。 */
  public clearSideEffect() {
    this.draw.getComponents().previewer.clearResizer()
    this.draw.getComponents().tableTool.dispose()
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    this.draw.getDateParticle().clearDatePicker()
  }
}
