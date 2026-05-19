import { ImageDisplay } from '../../../dataset/enum/Common'
import { EditorMode, EditorZone, PageMode } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { IDrawFloatPayload, IDrawPagePayload } from '../../../interface/Draw'
import { IRenderSurface } from '../../render-backend'
import type { Draw } from '../Draw'

/** 单页 base surface 的实际内容绘制器。 */
export class PageContentPainter {
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
        this.draw.getImageParticle().render(
          ctx,
          element,
          imgFloatPosition.x * scale,
          imgFloatPosition.y * scale,
          {
            isExport: payload.isExport
          }
        )
      }
    }
  }

  /**
   * 清理 base surface。
   *
   * @param surface - 当前页 base surface
   */
  public clearBaseSurface(surface: IRenderSurface) {
    const { canvas, ctx2d: ctx } = surface
    ctx.clearRect(
      0,
      0,
      Math.max(canvas.width, this.draw.getWidth()),
      Math.max(canvas.height, this.draw.getHeight())
    )
    this.draw.getBlockParticle().clear()
  }

  /**
   * 在指定 surface 上绘制整页内容。
   *
   * 当前仍复用原 Canvas2D 绘制逻辑，外层已由 RenderBackendManager 统一调度。
   */
  public drawPageToSurface(
    payload: IDrawPagePayload,
    surface: IRenderSurface,
    selectionCtx: CanvasRenderingContext2D | null = null
  ) {
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
    const ctx = surface.ctx2d

    // 分页模式下，基础正文走 base canvas，
    // 选区 / 搜索 / 控件高亮优先走 overlay canvas。
    ctx.globalAlpha = !this.draw.getZone().isMainActive() ? inactiveAlpha : 1
    this.clearBaseSurface(surface)
    this.draw.getBackground().render(ctx, pageNo)
    if (!isPrintMode) {
      this.draw.getArea().render(ctx, pageNo)
    }
    if (!isPrintMode) {
      this.draw.getMargin().render(ctx, pageNo)
    }
    this.drawFloat(ctx, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_BOTTOM],
      isExport: payload.isExport
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
      isExport: payload.isExport,
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
      imgDisplays: [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND, ImageDisplay.TIGHT],
      isExport: payload.isExport
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
    if (
      pageMode !== PageMode.CONTINUITY &&
      this.draw.getOptions().watermark.data
    ) {
      // 水印放到整页内容最后绘制，保证正文文字不会把水印压在下面。
      this.draw.getWaterMark().render(ctx, pageNo)
    }
  }
}
