import { LineNumberType } from '../../../../dataset/enum/LineNumber'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { Draw } from '../../../draw/Draw'

export class LineNumber {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>

  /** 初始化 LineNumber 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    const {
      scale,
      lineNumber: { color, size, font, right, type }
    } = this.options
    const textParticle = this.draw.getTextParticle()
    const margins = this.draw.getMargins()
    const positionList = this.draw.getCoordinate().getLayoutMainPositionList()
    const pageRowList = this.draw.getPageRowList()
    const rowList = pageRowList[pageNo]
    ctx.save()
    ctx.fillStyle = color
    ctx.font = `${size * scale}px ${font}`
    for (let i = 0; i < rowList.length; i++) {
      const row = rowList[i]
      const {
        coordinate: { leftBottom }
      } = positionList[row.startIndex]
      const seq = type === LineNumberType.PAGE ? i + 1 : row.rowIndex + 1
      const textMetrics = textParticle.measureText(ctx, {
        value: `${seq}`
      })
      const x = margins[3] - (textMetrics.width + right) * scale
      const y = leftBottom[1] - textMetrics.actualBoundingBoxAscent * scale
      ctx.fillText(`${seq}`, x, y)
    }
    ctx.restore()
  }
}
