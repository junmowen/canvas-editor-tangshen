import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { Draw } from '../../../draw/Draw'
import { FooterPageBorder } from './FooterPageBorder'
import { HeaderPageBorder } from './HeaderPageBorder'

export class PageBorder {
  /** 页眉区域边框绘制器，用于渲染页眉页边框。 */
  private headerBorder: HeaderPageBorder
  /** 页脚区域边框绘制器，用于渲染页脚页边框。 */
  private footerBorder: FooterPageBorder
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>

  /** 初始化 PageBorder 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.headerBorder = new HeaderPageBorder(draw)
    this.footerBorder = new FooterPageBorder(draw)
    this.options = draw.getRuntime().getOptions()
  }

  public render(ctx: CanvasRenderingContext2D, pageNo = 0, pageHeight?: number) {
    const {
      scale,
      pageBorder: { color, lineWidth }
    } = this.options
    ctx.save()
    ctx.translate(0.5, 0.5)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth * scale
    // 页边框四边依赖当前页边距，避免镜像页边距下边框仍按首页位置绘制。
    const x = this.headerBorder.getLeft(pageNo)
    const y = this.headerBorder.getTop(pageNo)
    const width = this.headerBorder.getWidth(pageNo)
    const height = Math.max(
      0,
      this.footerBorder.getBottom(pageNo, pageHeight) - y
    )
    ctx.rect(x, y, width, height)
    ctx.stroke()
    ctx.restore()
  }
}
