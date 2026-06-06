import { EditorZone } from '../../../../dataset/enum/Editor'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IRowElement } from '../../../../interface/Row'
import { Draw } from '../../../draw/Draw'

/**
 * 分隔线粒子。
 *
 * 负责分隔线的渲染。
 */
export class SeparatorParticle {
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   */
  constructor(draw: Draw) {
    this.draw = draw
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
    y: number,
    zone?: EditorZone,
    pageNo = 0
  ) {
    // 保存当前上下文状态
    ctx.save()
    // 获取分隔线样式配置
    const {
      scale,
      separator: { lineWidth, strokeStyle }
    } = this.options
    // 页眉页脚分隔线要跟随当前页边距，镜像页边距下左右端点不能沿用首页。
    const margins = this.draw.getMargins(pageNo)
    const marginIndicatorSize =
      this.draw.getServices().metricsService.getMarginIndicatorSize()
    const edgeGap = marginIndicatorSize / 4
    const renderedWidth = (element.width || 0) * scale
    const innerWidth = this.draw.getInnerWidth(pageNo)
    const isHeaderFooterSeparator =
      (zone === EditorZone.HEADER || zone === EditorZone.FOOTER) &&
      renderedWidth >= innerWidth - 1
    const lineStartX = isHeaderFooterSeparator ? margins[3] + edgeGap : x
    const lineEndX = isHeaderFooterSeparator
      ? this.draw.getWidth() - margins[1] - edgeGap
      : x + element.width! * scale
    // 设置线条宽度
    ctx.lineWidth = lineWidth * scale
    // 设置线条颜色
    ctx.strokeStyle = element.color || strokeStyle
    // 如果有虚线样式，设置虚线
    if (element.dashArray?.length) {
      ctx.setLineDash(element.dashArray)
    }
    // 计算 Y 坐标（四舍五入避免绘制模糊）
    const offsetY = Math.round(
      isHeaderFooterSeparator
        ? this.resolveHeaderFooterSeparatorY(y, edgeGap, zone, pageNo)
        : y
    )
    // 将原点移动到线条中心
    ctx.translate(0, ctx.lineWidth / 2)
    // 开始绘制路径
    ctx.beginPath()
    ctx.moveTo(lineStartX, offsetY)
    // 绘制到右侧
    ctx.lineTo(lineEndX, offsetY)
    // 描边
    ctx.stroke()
    // 恢复上下文状态
    ctx.restore()
  }

  private resolveHeaderFooterSeparatorY(
    y: number,
    edgeGap: number,
    zone?: EditorZone,
    pageNo = 0
  ): number {
    // 页眉页脚分隔线的上下端点同样按当前页边距计算。
    const margins = this.draw.getMargins(pageNo)
    if (zone === EditorZone.HEADER) {
      return margins[0] + edgeGap
    }
    if (zone === EditorZone.FOOTER) {
      return this.draw.getHeight() - margins[2] - edgeGap
    }
    return y
  }
}
