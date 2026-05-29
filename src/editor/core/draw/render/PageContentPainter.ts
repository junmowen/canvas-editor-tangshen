import { EditorMode, EditorZone, PageMode } from '../../../dataset/enum/Editor'
import { IDrawFloatPayload, IDrawPagePayload } from '../../../interface/Draw'
import { PageAreaRenderer } from '../../modules/area/render/PageAreaRenderer'
import { PageBackgroundRenderer } from '../../modules/background/render/PageBackgroundRenderer'
import { BlockRenderLifecycle } from '../../modules/block/render/BlockRenderLifecycle'
import { PageControlHighlightRenderer } from '../../modules/control/render/PageControlHighlightRenderer'
import { FloatImageRenderer } from '../../modules/image/render/FloatImageRenderer'
import { PageFrameRenderer } from '../../modules/page-setup/render/PageFrameRenderer'
import { PageMarginIndicatorRenderer } from '../../modules/page-setup/render/PageMarginIndicatorRenderer'
import { PagePlaceholderRenderer } from '../../modules/placeholder/render/PagePlaceholderRenderer'
import { PageSearchRenderer } from '../../modules/search/render/PageSearchRenderer'
import { IRenderSurface } from '../../render-backend'
import type { Draw } from '../Draw'

/** 单页 base surface 的实际内容绘制器。 */
export class PageContentPainter {
  private readonly pageBackgroundRenderer: PageBackgroundRenderer
  private readonly pageAreaRenderer: PageAreaRenderer
  private readonly blockRenderLifecycle: BlockRenderLifecycle
  private readonly pageControlHighlightRenderer: PageControlHighlightRenderer
  /** 浮动图片渲染器，封装图片展示模式和 zone 过滤。 */
  private readonly floatImageRenderer: FloatImageRenderer
  /** 页面框架渲染器，封装页边距、页眉页脚和水印等编排。 */
  private readonly pageFrameRenderer: PageFrameRenderer
  private readonly pageMarginIndicatorRenderer: PageMarginIndicatorRenderer
  private readonly pagePlaceholderRenderer: PagePlaceholderRenderer
  private readonly pageSearchRenderer: PageSearchRenderer

  /** 初始化 PageContentPainter 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {
    this.pageBackgroundRenderer = new PageBackgroundRenderer(draw)
    this.pageAreaRenderer = new PageAreaRenderer(draw)
    this.blockRenderLifecycle = new BlockRenderLifecycle(draw)
    this.pageControlHighlightRenderer = new PageControlHighlightRenderer(draw)
    this.floatImageRenderer = new FloatImageRenderer(draw)
    this.pageFrameRenderer = new PageFrameRenderer(draw)
    this.pageMarginIndicatorRenderer = new PageMarginIndicatorRenderer(draw)
    this.pagePlaceholderRenderer = new PagePlaceholderRenderer(draw)
    this.pageSearchRenderer = new PageSearchRenderer(draw)
  }

  /** 绘制当前页的浮动图片与浮动元素。 */
  public drawFloat(ctx: CanvasRenderingContext2D, payload: IDrawFloatPayload) {
    this.floatImageRenderer.drawFloat(ctx, payload)
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
    this.blockRenderLifecycle.clearRuntimeHosts()
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
    /** 纵向偏移量，用于调整绘制或命中位置。 */
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
      this.pageBackgroundRenderer.render(ctx, pageNo)
      this.pageAreaRenderer.render(ctx, pageNo, isPrintMode)
      this.pageMarginIndicatorRenderer.render(
        ctx,
        pageNo,
        pageMode,
        isPrintMode
      )
      this.floatImageRenderer.drawPageBottomFloatLayer(ctx, {
        pageNo,
        includeHeaderFooter: pageMode !== PageMode.CONTINUITY,
        isExport: payload.isExport
      })
      this.pageControlHighlightRenderer.render(
        selectionCtx || ctx,
        pageNo,
        isPrintMode
      )
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
        this.pageFrameRenderer.renderPagedFrame(ctx, payload)
      }
      this.floatImageRenderer.drawPageTopFloatLayer(ctx, {
        pageNo,
        includeHeaderFooter: pageMode !== PageMode.CONTINUITY,
        isExport: payload.isExport
      })
      this.pageSearchRenderer.render(selectionCtx || ctx, pageNo, isPrintMode)
      this.pagePlaceholderRenderer.render(ctx)
      if (pageMode === PageMode.CONTINUITY) {
        this.pageFrameRenderer.renderContinuousFrame(
          ctx,
          payload,
          surface,
          offsetY
        )
      }
    } finally {
      ctx.restore()
    }
  }
}
