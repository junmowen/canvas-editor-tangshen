import { ImageDisplay } from '../../../dataset/enum/Common'
import { EditorMode, EditorZone, PageMode } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { IDrawFloatPayload, IDrawPagePayload } from '../../../interface/Draw'
import type { Draw } from '../Draw'

/**
 * 页面渲染器。
 *
 * 负责单页清屏、浮动元素绘制以及可视区域渲染调度。
 */
export class PageRenderer {
  constructor(private readonly draw: Draw) {}

  /** 绘制当前页的浮动图片与浮动元素。 */
  public drawFloat(ctx: CanvasRenderingContext2D, payload: IDrawFloatPayload) {
    const { scale } = this.draw.getOptions()
    const floatPositionList = this.draw.getPosition().getFloatPositionList()
    const { imgDisplays, pageNo } = payload
    for (let e = 0; e < floatPositionList.length; e++) {
      const floatPosition = floatPositionList[e]
      const element = floatPosition.element
      if (
        (pageNo === floatPosition.pageNo ||
          floatPosition.zone === EditorZone.HEADER ||
          floatPosition.zone === EditorZone.FOOTER) &&
        element.imgDisplay &&
        imgDisplays.includes(element.imgDisplay) &&
        element.type === ElementType.IMAGE
      ) {
        const imgFloatPosition = element.imgFloatPosition!
        this.draw
          .getImageParticle()
          .render(
            ctx,
            element,
            imgFloatPosition.x * scale,
            imgFloatPosition.y * scale
          )
      }
    }
  }

  /** 清空指定页面基础画布。 */
  public clearPage(pageNo: number) {
    const ctx = this.draw.getPageCanvasHost().getCtxList()[pageNo]
    const pageDom = this.draw.getPageList()[pageNo]
    ctx.clearRect(
      0,
      0,
      Math.max(pageDom.width, this.draw.getWidth()),
      Math.max(pageDom.height, this.draw.getHeight())
    )
    this.draw.getBlockParticle().clear()
  }

  /** 按页绘制正文、页眉页脚与浮动元素。 */
  public drawPage(payload: IDrawPagePayload) {
    const { elementList, positionList, rowList, pageNo } = payload
    const {
      inactiveAlpha,
      pageMode,
      header,
      footer,
      pageNumber,
      lineNumber,
      pageBorder
    } = this.draw.getOptions()
    const isPrintMode = this.draw.getMode() === EditorMode.PRINT
    const innerWidth = this.draw.getInnerWidth()
    const ctx = this.draw.getPageCanvasHost().getCtxList()[pageNo]
    // 分页模式下，基础正文走 base canvas，
    // 选区 / 搜索 / 控件高亮优先走 overlay canvas。
    const selectionCtx = this.draw.getTableOverlayRenderer().prepareSelectionContext(pageNo)

    ctx.globalAlpha = !this.draw.getZone().isMainActive() ? inactiveAlpha : 1
    this.clearPage(pageNo)
    this.draw.getBackground().render(ctx, pageNo)
    if (!isPrintMode) {
      this.draw.getArea().render(ctx, pageNo)
    }
    if (
      pageMode !== PageMode.CONTINUITY &&
      this.draw.getOptions().watermark.data
    ) {
      this.draw.getWaterMark().render(ctx, pageNo)
    }
    if (!isPrintMode) {
      this.draw.getMargin().render(ctx, pageNo)
    }
    this.drawFloat(ctx, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_BOTTOM]
    })
    if (!isPrintMode) {
      this.draw.getControl().renderHighlightList(selectionCtx || ctx, pageNo)
    }
    // 行绘制只消费当前页切片后的位置列表，
    // 不再让 RowRenderer 自己在整份 positionList 上做 pageNo 过滤。
    const pagePositionList =
      pageNo >= 0
        ? this.draw.getPosition().getLayoutMainPositionListByPage(pageNo)
        : positionList
    const index = rowList[0]?.startIndex
    this.draw.drawRow(ctx, {
      elementList,
      positionList: pagePositionList,
      rowList,
      pageNo,
      startIndex: index,
      innerWidth,
      selectionCtx,
      zone: EditorZone.MAIN
    })
    if (this.draw.isPagingPageMode()) {
      if (!header.disabled) {
        this.draw.getHeader().render(ctx, pageNo)
      }
      if (!pageNumber.disabled) {
        this.draw.getPageNumber().render(ctx, pageNo)
      }
      if (!footer.disabled) {
        this.draw.getFooter().render(ctx, pageNo)
      }
    }
    this.drawFloat(ctx, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND]
    })
    if (!isPrintMode && this.draw.getSearch().getSearchKeyword()) {
      this.draw.getSearch().render(selectionCtx || ctx, pageNo)
    }
    if (
      this.draw.getOriginalMainElementList().length <= 1 &&
      !this.draw.getOriginalMainElementList()[0]?.listId
    ) {
      this.draw.getPlaceholder().render(ctx)
    }
    if (!lineNumber.disabled) {
      this.draw.getLineNumber().render(ctx, pageNo)
    }
    if (!pageBorder.disabled) {
      this.draw.getPageBorder().render(ctx)
    }
    this.draw.getBadge().render(ctx, pageNo)
  }

  /** 使用 requestAnimationFrame 延迟触发渲染。 */
  public lazyRender() {
    const positionList = this.draw.getPosition().getLayoutMainPositionList()
    const elementList = this.draw.getLayoutMainElementList()
    this.draw.disconnectLazyRender()
    this.draw.setLazyRenderObserver(
      new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = Number(
              (entry.target as HTMLCanvasElement).dataset.index
            )
            this.drawPage({
              elementList,
              positionList,
              rowList: this.draw.getPageRowList()[index],
              pageNo: index
            })
          }
        })
      })
    )
    this.draw.getPageList().forEach(el => {
      this.draw.getLazyRenderObserver()!.observe(el)
    })
  }

  /** 立即渲染所有页面。 */
  public immediateRender() {
    const positionList = this.draw.getPosition().getLayoutMainPositionList()
    const elementList = this.draw.getLayoutMainElementList()
    for (let i = 0; i < this.draw.getPageRowList().length; i++) {
      this.drawPage({
        elementList,
        positionList,
        rowList: this.draw.getPageRowList()[i],
        pageNo: i
      })
    }
  }

  /** 仅渲染当前视口内可见的页面。 */
  public renderVisiblePages() {
    const positionList = this.draw.getPosition().getLayoutMainPositionList()
    const elementList = this.draw.getLayoutMainElementList()
    const searchRenderPageNoList =
      this.draw.getSearch().consumeSearchRenderPageNoList()
    const pageNoList = this.draw.resolveVisibleRenderPageNos(searchRenderPageNoList)

    for (let i = 0; i < pageNoList.length; i++) {
      const pageNo = pageNoList[i]
      if (!this.draw.getPageRowList()[pageNo]) continue
      this.drawPage({
        elementList,
        positionList,
        rowList: this.draw.getPageRowList()[pageNo],
        pageNo
      })
    }
  }
}
