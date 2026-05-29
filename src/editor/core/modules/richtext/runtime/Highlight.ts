import { AbstractRichText } from './AbstractRichText'
import { IEditorOption } from '../../../../interface/Editor'
import { Draw } from '../../../draw/Draw'

export class Highlight extends AbstractRichText {
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: Required<IEditorOption>

  /** 初始化 Highlight 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    super()
    this.options = draw.getOptions()
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.fillRect.width) return
    const { highlightAlpha } = this.options
    const { x, y, width, height } = this.fillRect
    ctx.save()
    ctx.globalAlpha = highlightAlpha
    ctx.fillStyle = this.fillColor!
    ctx.fillRect(x, y, width, height)
    ctx.restore()
    this.clearFillInfo()
  }
}
