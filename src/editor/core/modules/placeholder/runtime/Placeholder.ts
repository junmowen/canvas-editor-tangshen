import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IPlaceholder } from '../../../../interface/Placeholder'
import { IRow } from '../../../../interface/Row'
import { formatElementList } from '../../../../utils/elementFormat'
import { Draw } from '../../../draw/Draw'
import type { DrawCoordinateService } from '../../../draw/coordinate/DrawCoordinateService'
import { LineBreakParticle } from '../../../draw/particle/LineBreakParticle'

/** placeholder渲染选项，用于约束调用方可传入的可选配置。 */
export interface IPlaceholderRenderOption {
  /** 占位内容，用于在空值或待输入状态下显示提示。 */
  placeholder: Required<IPlaceholder>
  /** 起始纵坐标，用于记录拖拽、绘制或选择的起点。 */
  startY?: number
}

export class Placeholder {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 坐标服务，用于读取元素位置、浮动元素和光标坐标。 */
  private coordinate: DrawCoordinateService
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>

  private elementList: IElement[]
  private rowList: IRow[]
  private positionList: IElementPosition[]

  /** 初始化 Placeholder 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.coordinate = draw.getCoordinate()
    this.options = <DeepRequired<IEditorOption>>draw.getOptions()

    this.elementList = []
    this.rowList = []
    this.positionList = []
  }

  private _recovery() {
    this.elementList = []
    this.rowList = []
    this.positionList = []
  }

  /** 计算当前项，产出布局或业务规则需要的中间结果。 */
  public _compute(options?: IPlaceholderRenderOption) {
    this._computeRowList()
    this._computePositionList(options)
  }

  /** 计算行列表，产出布局或业务规则需要的中间结果。 */
  private _computeRowList() {
    const innerWidth = this.draw.getInnerWidth()
    this.rowList = this.draw.computeRowList({
      innerWidth,
      elementList: this.elementList
    })
  }

  /** 计算位置列表，产出布局或业务规则需要的中间结果。 */
  private _computePositionList(options?: IPlaceholderRenderOption) {
    const { lineBreak, scale } = this.options
    const headerExtraHeight = this.draw.getHeader().getExtraHeight()
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    let startX = margins[3]
    // 换行符绘制开启时，移动起始位置
    if (!lineBreak.disabled) {
      startX += (LineBreakParticle.WIDTH + LineBreakParticle.GAP) * scale
    }
    const startY = options?.startY || margins[0] + headerExtraHeight
    this.coordinate.computePageRowPosition({
      positionList: this.positionList,
      rowList: this.rowList,
      pageNo: 0,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth
    })
  }

  public render(
    ctx: CanvasRenderingContext2D,
    options?: IPlaceholderRenderOption
  ) {
    const { placeholder = this.options.placeholder } = options || {}
    const { data, font, size, color, opacity } = placeholder
    this._recovery()
    // 构建元素列表并格式化
    this.elementList = [
      {
        value: data,
        font,
        size,
        color
      }
    ]
    formatElementList(this.elementList, {
      editorOptions: this.options,
      isForceCompensation: true
    })
    // 计算
    this._compute(options)
    const innerWidth = this.draw.getInnerWidth()
    // 绘制
    ctx.save()
    ctx.globalAlpha = opacity
    this.draw.drawRow(ctx, {
      elementList: this.elementList,
      positionList: this.positionList,
      rowList: this.rowList,
      pageNo: 0,
      startIndex: 0,
      innerWidth,
      isDrawLineBreak: false
    })
    ctx.restore()
  }
}
