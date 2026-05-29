import { AbstractRichText } from './AbstractRichText'
import { IEditorOption } from '../../../../interface/Editor'
import { Draw } from '../../../draw/Draw'

export class Strikeout extends AbstractRichText {
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: Required<IEditorOption>

  /** 初始化 Strikeout 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    super()
    this.options = draw.getOptions()
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.fillRect.width) return
    const { scale, strikeoutColor } = this.options
    const { x, y, width } = this.fillRect
    ctx.save()
    ctx.lineWidth = scale
    ctx.strokeStyle = strikeoutColor
    const adjustY = y + 0.5 // 从1处渲染，避免线宽度等于3
    ctx.beginPath()
    ctx.moveTo(x, adjustY)
    ctx.lineTo(x + width, adjustY)
    ctx.stroke()
    ctx.restore()
    this.clearFillInfo()
  }
}
