import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IRowElement } from '../../../interface/Row'
import { I18n } from '../../i18n/I18n'
import { Draw } from '../Draw'

/**
 * 分页符粒子。
 *
 * 负责分页符的渲染。
 */
export class PageBreakParticle {
  /** Draw 门面对象 */
  private draw: Draw
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>
  /** 国际化实例 */
  private i18n: I18n

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   * @param i18n - 国际化实例
   */
  constructor(draw: Draw, i18n: I18n) {
    this.draw = draw
    this.options = draw.getOptions()
    this.i18n = i18n
  }

  /**
   * 渲染分页符。
   *
   * @param ctx - 画布上下文
   * @param element - 行元素
   * @param x - X 坐标
   * @param y - Y 坐标
   */
  public render(
    ctx: CanvasRenderingContext2D,
    element: IRowElement,
    x: number,
    y: number
  ) {
    // 获取分页符样式配置
    const {
      pageBreak: { font, fontSize, lineDash }
    } = this.options
    // 获取分页符显示名称
    const displayName = this.i18n.t('pageBreak.displayName')
    const { scale, defaultRowMargin } = this.options
    // 计算字体大小
    const size = fontSize * scale
    // 计算元素宽度
    const elementWidth = element.width! * scale
    // 计算垂直偏移量（行边距）
    const offsetY =
      this.draw.getDefaultBasicRowMarginHeight() * defaultRowMargin
    // 保存当前上下文状态
    ctx.save()
    // 设置字体
    ctx.font = `${size}px ${font}`
    // 测量文本宽度
    const textMeasure = ctx.measureText(displayName)
    // 计算左侧横线的水平偏移（居中）
    const halfX = (elementWidth - textMeasure.width) / 2
    // 绘制横线
    ctx.setLineDash(lineDash)
    ctx.translate(0, 0.5 + offsetY)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + halfX, y)
    ctx.moveTo(x + halfX + textMeasure.width, y)
    ctx.lineTo(x + elementWidth, y)
    ctx.stroke()
    // 绘制文字
    ctx.fillText(
      displayName,
      x + halfX,
      y + textMeasure.actualBoundingBoxAscent - size / 2
    )
    // 恢复上下文状态
    ctx.restore()
  }
}
