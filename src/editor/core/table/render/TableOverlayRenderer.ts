import { EditorZone } from '../../../dataset/enum/Editor'
import { IDrawRowPayload } from '../../../interface/Draw'
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
    const overlayCtxList = this.draw.getPageCanvasHost().getOverlayCtxList()
    const overlayPageList = this.draw.getPageCanvasHost().getOverlayPageList()
    const ctx = overlayCtxList[pageNo]
    const pageDom = overlayPageList[pageNo]
    if (!ctx || !pageDom) {
      return null
    }
    ctx.clearRect(
      0,
      0,
      Math.max(pageDom.width, this.draw.getWidth()),
      Math.max(pageDom.height, this.draw.getHeight())
    )
    return ctx
  }

  public renderVisibleOverlay() {
    // overlay 当前承接的是“可视页上的装饰层”：
    // 选区、搜索高亮、控件高亮都从这里按页分发。
    const positionList = this.draw.getPosition().getLayoutMainPositionList()
    const elementList = this.draw.getLayoutMainElementList()
    const innerWidth = this.draw.getInnerWidth()
    const searchRenderPageNoList =
      this.draw.getSearch().consumeSearchRenderPageNoList()
    const pageNoList =
      this.draw.resolveVisibleRenderPageNos(searchRenderPageNoList)

    for (let i = 0; i < pageNoList.length; i++) {
      const pageNo = pageNoList[i]
      const rowList = this.draw.getPageRowList()[pageNo]
      if (!rowList?.length) {
        continue
      }
      const selectionCtx = this.prepareSelectionContext(pageNo)
      if (!selectionCtx) {
        continue
      }
      const pagePositionList =
        pageNo >= 0
          ? this.draw.getPosition().getLayoutMainPositionListByPage(pageNo)
          : positionList
      const payload: IDrawRowPayload = {
        elementList,
        positionList: pagePositionList,
        rowList,
        pageNo,
        startIndex: rowList[0]?.startIndex,
        innerWidth,
        selectionCtx,
        zone: EditorZone.MAIN
      }
      this.draw.getControl().renderHighlightList(selectionCtx, pageNo)
      this.draw.drawSelection(selectionCtx, payload)
      if (this.draw.getSearch().getSearchKeyword()) {
        this.draw.getSearch().render(selectionCtx, pageNo)
      }
    }
  }
}
