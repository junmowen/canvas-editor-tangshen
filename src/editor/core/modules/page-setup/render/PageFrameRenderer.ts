import { ImageDisplay } from '../../../../dataset/enum/Common'
import { EditorMode } from '../../../../dataset/enum/Editor'
import { IDrawPagePayload } from '../../../../interface/Draw'
import { FloatImageRenderer } from '../../image/render/FloatImageRenderer'
import { IRenderSurface } from '../../../render-backend'
import type { Draw } from '../../../draw/Draw'

/** 页面框架渲染器，负责页边距、页眉页脚、页码、行号、边框、签章和水印编排。 */
export class PageFrameRenderer {
  /** 浮动图片渲染器，用于绘制页眉页脚内浮动图片。 */
  private readonly floatImageRenderer: FloatImageRenderer

  /** 初始化 PageFrameRenderer 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {
    this.floatImageRenderer = new FloatImageRenderer(draw)
  }

  private getVisibleSegmentRange(surface: IRenderSurface, offsetY: number) {
    const pageHeight = this.draw.getHeight()
    const surfaceHeight =
      surface.height || surface.canvas.clientHeight || pageHeight
    const pageCount = Math.max(
      1,
      Math.ceil(
        this.draw.getPageCanvasHost().getPageHeight(surface.pageNo) / pageHeight
      )
    )
    const start = Math.max(0, Math.floor(offsetY / pageHeight))
    const end = Math.min(
      pageCount - 1,
      Math.floor((offsetY + surfaceHeight - 1) / pageHeight)
    )
    return { start, end, pageHeight }
  }

  public renderPagedFrame(
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

  public renderContinuousFrame(
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
    this.floatImageRenderer.renderHeaderFooterFloatList(ctx, payload, [
      ImageDisplay.FLOAT_BOTTOM
    ])
    if (!header.disabled) {
      this.draw.getHeader().render(ctx, payload.pageNo)
    }
    if (!footer.disabled) {
      this.draw.getFooter().render(ctx, payload.pageNo, {
        pageHeight: totalHeight
      })
    }
    this.floatImageRenderer.renderHeaderFooterFloatList(ctx, payload, [
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
}
