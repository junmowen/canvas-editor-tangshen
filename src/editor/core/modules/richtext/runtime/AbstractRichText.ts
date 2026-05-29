import { TextDecorationStyle } from '../../../../dataset/enum/Text'
import { IElementFillRect } from '../../../../interface/Element'

export abstract class AbstractRichText {
  protected fillRect: IElementFillRect
  /** 富文本装饰填充色，用于下划线、删除线或高亮绘制。 */
  protected fillColor?: string
  protected fillDecorationStyle?: TextDecorationStyle

  /** 初始化 AbstractRichText 实例并注入运行依赖。 */
  constructor() {
    this.fillRect = this.clearFillInfo()
  }

  public clearFillInfo() {
    this.fillColor = undefined
    this.fillDecorationStyle = undefined
    this.fillRect = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
    return this.fillRect
  }

  /** 记录fillinfo，把当前命中结果写入缓存或统计。 */
  public recordFillInfo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height?: number,
    color?: string,
    decorationStyle?: TextDecorationStyle
  ) {
    const isFirstRecord = !this.fillRect.width
    // 颜色不同时立即绘制
    if (
      !isFirstRecord &&
      (this.fillColor !== color || this.fillDecorationStyle !== decorationStyle)
    ) {
      this.render(ctx)
      this.clearFillInfo()
      // 重新记录
      this.recordFillInfo(ctx, x, y, width, height, color, decorationStyle)
      return
    }
    if (isFirstRecord) {
      this.fillRect.x = x
      this.fillRect.y = y
    }
    if (height && this.fillRect.height < height) {
      this.fillRect.height = height
    }
    this.fillRect.width += width
    this.fillColor = color
    this.fillDecorationStyle = decorationStyle
  }

  public abstract render(ctx: CanvasRenderingContext2D): void
}
