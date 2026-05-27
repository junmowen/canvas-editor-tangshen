import { EditorZone } from '../../../dataset/enum/Editor'
import { IDrawRowPayload } from '../../../interface/Draw'
import { IRenderSurface, RenderLayer } from '../../render-backend'
import type { Draw } from '../../draw/Draw'

/**
 * 第一阶段 overlay 渲染器。
 *
 * 当前先负责分页 overlay 画布的清理与上下文分发，
 * 让选区/光标后续可以逐步迁入独立层，而不直接耦合在 PageRenderer 中。
 */
export class TableOverlayRenderer {
  constructor(private readonly draw: Draw) {}

  /** 为指定页准备 overlay 画布上下文，并先清理该页旧像素。 */
  public prepareSelectionContext(
    pageNo: number
  ): CanvasRenderingContext2D | null {
    const surface = this.draw
      .getPageCanvasHost()
      .getSurface(pageNo, RenderLayer.OVERLAY)
    if (!surface) {
      return null
    }
    // overlay 即将重绘，先使对应 bitmap 缓存失效，避免后续缓存合成读到旧内容。
    this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.OVERLAY)
    this.draw.getServices().renderBackendManager.render(surface, {
      pageNo,
      layer: RenderLayer.OVERLAY,
      reason: 'overlay-visible',
      priority: 'sync',
      execute: currentSurface => {
        this.clearOverlaySurface(currentSurface)
      }
    })
    return surface.ctx2d
  }

  /**
   * 清理指定页 overlay surface。
   *
   * @param surface - 当前页 overlay surface
   */
  private clearOverlaySurface(surface: IRenderSurface) {
    const { canvas, ctx2d: ctx } = surface
    ctx.clearRect(
      0,
      0,
      Math.max(canvas.width, this.draw.getWidth()),
      Math.max(canvas.height, this.draw.getHeight())
    )
  }

  /** 清理指定页 overlay 层，供表格迁移和页面强制重绘前使用。 */
  public clearPage(pageNo: number) {
    const surface = this.draw
      .getPageCanvasHost()
      .getSurface(pageNo, RenderLayer.OVERLAY)
    if (!surface) {
      return
    }
    this.clearOverlaySurface(surface)
  }

  /**
   * 渲染指定页 overlay 内容。
   *
   * @param pageNo - 目标页码
   * @param positionList - 当前主文档位置列表
   * @param elementList - 当前主文档元素列表
   */
  public renderPageOverlay(
    pageNo: number,
    positionList = this.draw.getCoordinate().getLayoutMainPositionList(),
    elementList = this.draw.getObjectResolver().getLayoutMainElementList()
  ) {
    const rowList = this.draw.getPageRowList()[pageNo]
    if (!rowList?.length) {
      return
    }
    const selectionCtx = this.prepareSelectionContext(pageNo)
    if (!selectionCtx) {
      return
    }
    const pagePositionList =
      pageNo >= 0
        ? this.draw.getCoordinate().getLayoutMainPositionListByPage(pageNo)
        : positionList
    const payload: IDrawRowPayload = {
      elementList,
      positionList: pagePositionList,
      rowList,
      pageNo,
      startIndex: rowList[0]?.startIndex,
      innerWidth: this.draw.getInnerWidth(),
      selectionCtx,
      zone: EditorZone.MAIN
    }
    this.draw.getControl().renderHighlightList(selectionCtx, pageNo)
    this.draw.drawSelection(selectionCtx, payload)
    if (this.draw.getSearch().getSearchKeyword()) {
      this.draw.getSearch().render(selectionCtx, pageNo)
    }
  }

  /** 渲染当前可视页 overlay 内容。 */
  public renderVisibleOverlay() {
    // overlay 当前承接的是“可视页上的装饰层”：
    // 选区、搜索高亮、控件高亮都从这里按页分发。
    const positionList = this.draw.getCoordinate().getLayoutMainPositionList()
    const elementList = this.draw.getObjectResolver().getLayoutMainElementList()
    const searchRenderPageNoList =
      this.draw.getSearch().consumeSearchRenderPageNoList()
    const pageNoList =
      this.draw.resolveVisibleRenderPageNos(searchRenderPageNoList)

    for (let i = 0; i < pageNoList.length; i++) {
      this.renderPageOverlay(pageNoList[i], positionList, elementList)
    }
  }
}
