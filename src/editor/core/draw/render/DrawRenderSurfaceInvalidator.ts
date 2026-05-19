import { RenderLayer } from '../../render-backend'
import type { Draw } from '../Draw'

/** Draw 渲染门面的 surface / bitmap cache 失效 helper。 */
export class DrawRenderSurfaceInvalidator {
  constructor(private readonly draw: Draw) {}

  /** 局部 patch 后刷新受影响页，并处理表格迁移导致的旧 surface 残留。 */
  public applyTypingPatchInvalidation(payload: {
    affectedPageNoList: number[]
    requiresSurfaceClear?: boolean
    oldPageSize: number
  }) {
    const { affectedPageNoList, requiresSurfaceClear, oldPageSize } = payload
    if (!affectedPageNoList.length) {
      this.draw.getPageCanvasHost().invalidateAllBitmapCache()
      return
    }
    if (this.draw.getPageRowList().length !== oldPageSize) {
      this.draw.getPageCanvasHost().invalidateAllBitmapCache()
    }
    // 局部 patch 改变的页可能不止当前页；页 chunk 搬移表格时必须同时清理旧页和新页。
    affectedPageNoList.forEach(pageNo => {
      this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.BASE)
      if (requiresSurfaceClear) {
        this.draw
          .getPageCanvasHost()
          .invalidateBitmapCache(pageNo, RenderLayer.OVERLAY)
      }
    })
    if (requiresSurfaceClear) {
      this.clearAffectedSurfaces(affectedPageNoList)
    }
    this.draw.enqueueExtraVisibleRenderPages(affectedPageNoList)
    // 页级 chunk 可能新增页面，必须先创建页面外壳，再消费额外渲染页队列。
    this.draw.getPageCanvasHost().setPageCount(this.draw.getPageRowList().length)
    // 局部 patch 写回后，所有受影响可见页必须重绘，避免旧 canvas 文本或表格线残留。
    this.draw.getServices().renderPipeline.render({
      isLazy: false,
      pageRenderScope: 'visible'
    })
  }

  /** 失效并清理一批表格旧页，避免完整 layout 后旧边框残留在 base canvas 上。 */
  public invalidateTablePages(pageNoList: number[]) {
    const validPageNoList = Array.from(new Set(pageNoList)).filter(
      pageNo => this.draw.getPageRowList()[pageNo]
    )
    this.draw.enqueueExtraVisibleRenderPages(validPageNoList)
    validPageNoList.forEach(pageNo => {
      this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.BASE)
      this.draw.getServices().pageRenderer.clearPage(pageNo)
    })
  }

  /** 强制清理受影响页的基础层、覆盖层和表格工具 DOM，避免表格迁移后旧线条残留。 */
  public clearAffectedSurfaces(pageNoList: number[]) {
    pageNoList.forEach(pageNo => {
      this.draw.getServices().pageRenderer.clearPage(pageNo)
      this.draw.getTableOverlayRenderer().clearPage(pageNo)
      this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.BASE)
      this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.OVERLAY)
    })
    this.draw.getComponents().tableTool.dispose()
  }
}
