import { IDrawOption } from '../../../interface/Draw'
import { ITableLayoutSnapshot } from '../../table/layout/TableLayoutSnapshotTypes'
import { nextTick } from '../../../utils'
import type { Draw } from '../Draw'

export class DrawRenderFacadeService {
  constructor(private readonly draw: Draw) {}

  public getTableLayoutSnapshot(): ITableLayoutSnapshot {
    let tableLayoutSnapshot = this.draw.getRuntime().getTableLayoutSnapshot()
    if (!tableLayoutSnapshot) {
      tableLayoutSnapshot = this.draw.getServices().tableLayoutSnapshotBuilder.build({
        version: this.draw.getTableLayoutSnapshotVersion()
      })
      this.draw.getRuntime().replaceTableLayoutSnapshot(tableLayoutSnapshot)
    }
    return tableLayoutSnapshot
  }

  public render(payload?: IDrawOption) {
    this.draw.getServices().renderInvalidationManager.cancelScheduledFrameRender()
    this.draw.getViewState().incrementRenderCount()
    const {
      isSubmitHistory = true,
      isSetCursor = true,
      isCompute = true,
      isLazy = true,
      pageRenderScope = 'all',
      isInit = false,
      isSourceHistory = false,
      isFirstRender = false
    } = payload || {}
    let { curIndex } = payload || {}
    if (isCompute) {
      this.draw.getServices().renderInvalidationManager.markLayoutDirty()
    }
    const oldPageSize = this.draw.getPageRowList().length
    if (isCompute) {
      const layoutResult = this.draw.getServices().layoutPipeline.compute()
      if (layoutResult.continuousPageHeight !== undefined) {
        this.draw
          .getPageCanvasHost()
          .resizeContinuousPage(0, layoutResult.continuousPageHeight, this.draw.getHeight())
      }
    }
    this.draw.getComponents().imageObserver.clearAll()
    this.draw.getComponents().cursor.recoveryCursor()
    this.draw.getPageCanvasHost().setPageCount(this.draw.getPageRowList().length)
    this.draw.getServices().renderPipeline.render({
      isLazy,
      pageRenderScope
    })
    if (isSetCursor) {
      curIndex = this.draw.setCursor(curIndex)
    } else if (this.draw.getRange().getIsSelection()) {
      this.draw.getComponents().cursor.focus()
    }
    if (
      (isSubmitHistory && !isFirstRender) ||
      (curIndex !== undefined &&
        this.draw.getComponents().historyManager.isStackEmpty())
    ) {
      this.draw.submitHistory(curIndex)
    }
    nextTick(() => {
      this.draw.getServices().postRenderEffects.run(
        {
          isCompute,
          isSubmitHistory,
          isSourceHistory,
          isInit
        },
        oldPageSize
      )
    })
  }
}
