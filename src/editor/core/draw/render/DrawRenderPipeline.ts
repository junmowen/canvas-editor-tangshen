import { IDrawOption } from '../../../interface/Draw'
import type { Draw } from '../Draw'

export class DrawRenderPipeline {
  constructor(private readonly draw: Draw) {}

  public render(payload: Required<Pick<IDrawOption, 'isLazy' | 'pageRenderScope'>>) {
    const isPagingMode = this.draw.getIsPagingMode()
    if (payload.isLazy && isPagingMode) {
      this._clearDirtyState()
      this.draw.getServices().pageRenderer.lazyRender()
      return
    }

    if (isPagingMode && payload.pageRenderScope === 'visible') {
      this.draw.getServices().renderInvalidationManager.markVisiblePagesDirty()
      this._clearDirtyState({ keepVisiblePagesDirty: true })
      this.draw.getServices().pageRenderer.renderVisiblePages()
      return
    }

    this._clearDirtyState()
    this.draw.getServices().pageRenderer.immediateRender()
  }

  private _clearDirtyState(options?: { keepVisiblePagesDirty?: boolean }) {
    if (!options?.keepVisiblePagesDirty) {
      this.draw.getServices().renderInvalidationManager.clearVisiblePagesDirty()
    }
    this.draw.getServices().renderInvalidationManager.clearLayoutDirty()
    this.draw.getServices().renderInvalidationManager.clearSelectionDirty()
    this.draw.getServices().renderInvalidationManager.clearSearchDirty()
    this.draw.getServices().renderInvalidationManager.clearControlDirty()
    this.draw.getServices().renderInvalidationManager.clearOverlayDirty()
  }
}
