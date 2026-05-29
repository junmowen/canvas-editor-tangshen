import { PageMode } from '../../../../dataset/enum/Editor'
import { IEditorOption } from '../../../../interface/Editor'
import { Draw } from '../../../draw/Draw'

/** 页边距指示器渲染器，负责在当前页绘制四角边距标记。 */
export class Margin {
  /** Draw 门面实例，用于读取页面尺寸、页边距和渲染 surface。 */
  private draw: Draw
  /** 编辑器配置快照，提供页模式和指示器颜色。 */
  private options: Required<IEditorOption>

  /** 初始化 Margin 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
  }

  /**
   * 绘制指定页面的页边距标记。
   *
   * @param ctx - 当前页 base surface 的 2D 上下文
   * @param pageNo - 当前页码
   */
  public render(ctx: CanvasRenderingContext2D, pageNo: number, pageHeight?: number) {
    const { marginIndicatorColor, pageMode } = this.options
    const width = this.draw.getWidth()
    const height =
      pageHeight !== undefined
        ? pageHeight
        : pageMode === PageMode.CONTINUITY
        ? this.draw.getPageCanvasHost().getPageHeight(pageNo)
        : this.draw.getHeight()
    const margins = this.draw.getMargins()
    const marginIndicatorSize =
      this.draw.getServices().metricsService.getMarginIndicatorSize()
    ctx.save()
    ctx.translate(0.5, 0.5)
    ctx.strokeStyle = marginIndicatorColor
    ctx.beginPath()
    // 初始化 left Top Point 列表。
    const leftTopPoint: [number, number] = [margins[3], margins[0]]
    // 初始化 right Top Point 列表。
    const rightTopPoint: [number, number] = [width - margins[1], margins[0]]
    // 初始化 left Bottom Point 列表。
    const leftBottomPoint: [number, number] = [margins[3], height - margins[2]]
    // 初始化 right Bottom Point 列表。
    const rightBottomPoint: [number, number] = [
      width - margins[1],
      height - margins[2]
    ]
    // 上左
    ctx.moveTo(leftTopPoint[0] - marginIndicatorSize, leftTopPoint[1])
    ctx.lineTo(...leftTopPoint)
    ctx.lineTo(leftTopPoint[0], leftTopPoint[1] - marginIndicatorSize)
    // 上右
    ctx.moveTo(rightTopPoint[0] + marginIndicatorSize, rightTopPoint[1])
    ctx.lineTo(...rightTopPoint)
    ctx.lineTo(rightTopPoint[0], rightTopPoint[1] - marginIndicatorSize)
    // 下左
    ctx.moveTo(leftBottomPoint[0] - marginIndicatorSize, leftBottomPoint[1])
    ctx.lineTo(...leftBottomPoint)
    ctx.lineTo(leftBottomPoint[0], leftBottomPoint[1] + marginIndicatorSize)
    // 下右
    ctx.moveTo(rightBottomPoint[0] + marginIndicatorSize, rightBottomPoint[1])
    ctx.lineTo(...rightBottomPoint)
    ctx.lineTo(rightBottomPoint[0], rightBottomPoint[1] + marginIndicatorSize)
    ctx.stroke()
    ctx.restore()
  }
}
