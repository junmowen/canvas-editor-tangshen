import { AbstractRichText } from './AbstractRichText'
import { IEditorOption } from '../../../../interface/Editor'
import { Draw } from '../../../draw/Draw'
import { DashType, TextDecorationStyle } from '../../../../dataset/enum/Text'

export class Underline extends AbstractRichText {
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: Required<IEditorOption>

  /** 初始化 Underline 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    super()
    this.options = draw.getOptions()
  }

  // 绘制单实线下划线。
  private _drawLine(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    width: number,
    dashType?: DashType
  ) {
    const endX = startX + width
    ctx.beginPath()
    switch (dashType) {
      case DashType.DASHED:
        // 虚线效果：- - - - -
        ctx.setLineDash([3, 1])
        break
      case DashType.DOTTED:
        // 点线效果：. . . . . .
        ctx.setLineDash([1, 1])
        break
    }
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, startY)
    ctx.stroke()
  }

  // 绘制双下划线。
  private _drawDouble(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    width: number
  ) {
    // SPACING 间距，用于控制图形点位或文本装饰的距离。
    const SPACING = 3 // 双线之间的垂直间距。
    const endX = startX + width
    const endY = startY + SPACING * this.options.scale
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, startY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(startX, endY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
  }

  // 绘制波浪下划线。
  private _drawWave(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    width: number
  ) {
    const { scale } = this.options
    // AMPLITUDE 波幅，用于控制波浪线装饰高度。
    const AMPLITUDE = 1.2 * scale // 波浪振幅。
    // FREQUENCY 频率，用于控制波浪线装饰密度。
    const FREQUENCY = 1 / scale // 波浪频率。
    const adjustY = startY + 2 * AMPLITUDE // 下移基线，避免波峰贴边。
    ctx.beginPath()
    for (let x = 0; x < width; x++) {
      const y = AMPLITUDE * Math.sin(FREQUENCY * x)
      ctx.lineTo(startX + x, adjustY + y)
    }
    ctx.stroke()
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.fillRect.width) return
    const { underlineColor, scale } = this.options
    const { x, y, width } = this.fillRect
    ctx.save()
    ctx.strokeStyle = this.fillColor || underlineColor
    ctx.lineWidth = scale
    const adjustY = Math.floor(y + 2 * ctx.lineWidth) + 0.5 // +0.5 用于对齐像素，避免线条发虚。
    switch (this.fillDecorationStyle) {
      case TextDecorationStyle.WAVY:
        this._drawWave(ctx, x, adjustY, width)
        break
      case TextDecorationStyle.DOUBLE:
        this._drawDouble(ctx, x, adjustY, width)
        break
      case TextDecorationStyle.DASHED:
        this._drawLine(ctx, x, adjustY, width, DashType.DASHED)
        break
      case TextDecorationStyle.DOTTED:
        this._drawLine(ctx, x, adjustY, width, DashType.DOTTED)
        break
      default:
        this._drawLine(ctx, x, adjustY, width)
        break
    }
    ctx.restore()
    this.clearFillInfo()
  }
}
