import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { Draw } from '../Draw'
import { FooterPageBorder } from './FooterPageBorder'
import { HeaderPageBorder } from './HeaderPageBorder'

export class PageBorder {
  private headerBorder: HeaderPageBorder
  private footerBorder: FooterPageBorder
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.headerBorder = new HeaderPageBorder(draw)
    this.footerBorder = new FooterPageBorder(draw)
    this.options = draw.getRuntime().getOptions()
  }

  public render(ctx: CanvasRenderingContext2D) {
    const {
      scale,
      pageBorder: { color, lineWidth }
    } = this.options
    ctx.save()
    ctx.translate(0.5, 0.5)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth * scale
    const x = this.headerBorder.getLeft()
    const y = this.headerBorder.getTop()
    const width = this.headerBorder.getWidth()
    const height = Math.max(0, this.footerBorder.getBottom() - y)
    ctx.rect(x, y, width, height)
    ctx.stroke()
    ctx.restore()
  }
}
