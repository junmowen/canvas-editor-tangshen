import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IRowElement } from '../../../interface/Row'
import { Draw } from '../Draw'

/**
 * 分隔线粒子。
 *
 * 负责分隔线的渲染。
 */
export class SeparatorParticle {
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   */
  constructor(draw: Draw) {
    this.options = draw.getOptions()
  }

  /**
   * 渲染分隔线。
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
    // 保存当前上下文状态
    ctx.save()
    // 获取分隔线样式配置
    const {
      scale,
      separator: { lineWidth, strokeStyle }
    } = this.options
    // 设置线条宽度
    ctx.lineWidth = lineWidth * scale
    // 设置线条颜色
    ctx.strokeStyle = element.color || strokeStyle
    // 如果有虚线样式，设置虚线
    if (element.dashArray?.length) {
      ctx.setLineDash(element.dashArray)
    }
    // 计算 Y 坐标（四舍五入避免绘制模糊）
    const offsetY = Math.round(y)
    // 将原点移动到线条中心
    ctx.translate(0, ctx.lineWidth / 2)
    // 开始绘制路径
    ctx.beginPath()
    ctx.moveTo(x, offsetY)
    // 绘制到右侧
    ctx.lineTo(x + element.width! * scale, offsetY)
    // 描边
    ctx.stroke()
    // 恢复上下文状态
    ctx.restore()
  }
}
