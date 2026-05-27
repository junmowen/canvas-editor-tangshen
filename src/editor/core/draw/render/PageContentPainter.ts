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
    const floatPositionList = this.draw.getCoordinate().getFloatPositionList()
    const {
      imgDisplays,
      pageNo,
      zoneList,
      includeHeaderFooter = !zoneList
    } = payload
    for (let e = 0; e < floatPositionList.length; e++) {
      const floatPosition = floatPositionList[e]
      const element = floatPosition.element
      const shouldRenderByZone = zoneList
        ? zoneList.includes(floatPosition.zone!)
        : pageNo === floatPosition.pageNo ||
          (includeHeaderFooter &&
            (floatPosition.zone === EditorZone.HEADER ||
              floatPosition.zone === EditorZone.FOOTER))
      if (
        shouldRenderByZone &&
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

  private renderHeaderFooterFloatList(
    ctx: CanvasRenderingContext2D,
    payload: IDrawPagePayload,
    imgDisplays: ImageDisplay[]
  ) {
    this.drawFloat(ctx, {
      pageNo: payload.pageNo,
      imgDisplays,
      zoneList: [EditorZone.HEADER, EditorZone.FOOTER],
      isExport: payload.isExport
    })
  }

  private getVisibleSegmentRange(surface: IRenderSurface, offsetY: number) {
    const pageHeight = this.draw.getHeight()
    const surfaceHeight = surface.height || surface.canvas.clientHeight || pageHeight
    const pageCount = Math.max(
      1,
      Math.ceil(this.draw.getPageCanvasHost().getPageHeight(surface.pageNo) / pageHeight)
    )
    const start = Math.max(0, Math.floor(offsetY / pageHeight))
    const end = Math.min(
      pageCount - 1,
      Math.floor((offsetY + surfaceHeight - 1) / pageHeight)
    )
    return { start, end, pageHeight }
  }

  private renderPagedFrame(
    ctx: CanvasRenderingContext2D,
    payload: IDrawPagePayload
  ) {
    const {
      header,
      footer,
      pageNumber,
      lineNumber,
      pageBorder
    } = this.draw.getOptions()
    const isPrintMode = this.draw.getMode() === EditorMode.PRINT

    if (!isPrintMode) {
      this.draw.getMargin().render(ctx, payload.pageNo)
    }
    if (!header.disabled) {
      this.draw.getHeader().render(ctx, payload.pageNo)
    }
    if (!pageNumber.disabled) {
      this.draw.getComponents().pageNumber.render(ctx, payload.pageNo)
    }
    if (!footer.disabled) {
      this.draw.getFooter().render(ctx, payload.pageNo)
    }
    if (!lineNumber.disabled) {
      this.draw.getComponents().lineNumber.render(ctx, payload.pageNo)
    }
    if (!pageBorder.disabled) {
      this.draw.getPageBorder().render(ctx, payload.pageNo)
    }
    this.draw.getBadge().render(ctx, payload.pageNo)
    if (this.draw.getOptions().watermark.data) {
      this.draw.getWaterMark().render(ctx, payload.pageNo)
    }
  }

  private renderContinuousFrame(
    ctx: CanvasRenderingContext2D,
    payload: IDrawPagePayload,
    surface: IRenderSurface,
    offsetY: number
  ) {
    const { header, footer, pageBorder } = this.draw.getOptions()
    const isPrintMode = this.draw.getMode() === EditorMode.PRINT
    const { start, end, pageHeight } = this.getVisibleSegmentRange(surface, offsetY)
    const totalHeight = this.draw
      .getPageCanvasHost()
      .getPageHeight(payload.pageNo)

    if (!isPrintMode) {
      this.draw.getMargin().render(ctx, payload.pageNo, totalHeight)
    }
    this.renderHeaderFooterFloatList(ctx, payload, [ImageDisplay.FLOAT_BOTTOM])
    if (!header.disabled) {
      this.draw.getHeader().render(ctx, payload.pageNo)
    }
    if (!footer.disabled) {
      this.draw.getFooter().render(ctx, payload.pageNo, {
        pageHeight: totalHeight
      })
    }
    this.renderHeaderFooterFloatList(ctx, payload, [
      ImageDisplay.FLOAT_TOP,
      ImageDisplay.SURROUND,
      ImageDisplay.TIGHT
    ])
    if (!pageBorder.disabled) {
      this.draw.getPageBorder().render(ctx, payload.pageNo, totalHeight)
    }
    this.draw.getBadge().render(ctx, payload.pageNo)
    for (let segmentIndex = start; segmentIndex <= end; segmentIndex++) {
      const segmentTop = segmentIndex * pageHeight
      ctx.save()
      ctx.translate(0, segmentTop)
      try {
        if (this.draw.getOptions().watermark.data) {
          this.draw.getWaterMark().render(ctx, segmentIndex)
        }
      } finally {
        ctx.restore()
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
    selectionCtx: CanvasRenderingContext2D | null = null,
    options: { offsetY?: number } = {}
  ) {
    const { elementList, positionList, rowList, pageNo } = payload
    const {
      inactiveAlpha,
      pageMode
    } = this.draw.getOptions()
    const isPrintMode = this.draw.getMode() === EditorMode.PRINT
    const innerWidth = this.draw.getInnerWidth()
    const ctx = surface.ctx2d
    const offsetY = options.offsetY || 0

    // 分页模式下，基础正文走 base canvas，
    // 选区 / 搜索 / 控件高亮优先走 overlay canvas。
    this.clearBaseSurface(surface)
    ctx.save()
    if (offsetY) {
      ctx.translate(0, -offsetY)
    }
    try {
      ctx.globalAlpha = !this.draw.getZone().isMainActive() ? inactiveAlpha : 1
      this.draw.getBackground().render(ctx, pageNo)
      if (!isPrintMode) {
        this.draw.getArea().render(ctx, pageNo)
      }
      if (!isPrintMode && pageMode !== PageMode.CONTINUITY) {
        this.draw.getMargin().render(ctx, pageNo)
      }
      this.drawFloat(ctx, {
        pageNo,
        imgDisplays: [ImageDisplay.FLOAT_BOTTOM],
        includeHeaderFooter: pageMode !== PageMode.CONTINUITY,
        isExport: payload.isExport
      })
      if (!isPrintMode) {
        this.draw.getControl().renderHighlightList(selectionCtx || ctx, pageNo)
      }
      // 行绘制只消费当前页切片后的位置列表，
      // 不再让 RowRenderer 自己在整份 positionList 上做 pageNo 过滤。
      const pagePositionList =
        pageNo >= 0
          ? this.draw.getCoordinate().getLayoutMainPositionListByPage(pageNo)
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
      if (pageMode !== PageMode.CONTINUITY) {
        this.renderPagedFrame(ctx, payload)
      }
      this.drawFloat(ctx, {
        pageNo,
        imgDisplays: [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND, ImageDisplay.TIGHT],
        includeHeaderFooter: pageMode !== PageMode.CONTINUITY,
        isExport: payload.isExport
      })
      if (!isPrintMode && this.draw.getSearch().getSearchKeyword()) {
        this.draw.getSearch().render(selectionCtx || ctx, pageNo)
      }
      if (
        this.draw.getObjectResolver().getIsOriginalMainPlaceholderAvailable()
      ) {
        this.draw.getComponents().placeholder.render(ctx)
      }
      if (pageMode === PageMode.CONTINUITY) {
        this.renderContinuousFrame(ctx, payload, surface, offsetY)
      }
    } finally {
      ctx.restore()
    }
  }
}
