import { maxHeightRadioMapping } from '../../../../dataset/constant/Common'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import { Zone } from '../../../runtime/zone/Zone'
import { Draw } from '../../../draw/Draw'
import type { DrawCoordinateService } from '../../../draw/coordinate/DrawCoordinateService'

export class Footer {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 坐标服务，用于读取元素位置、浮动元素和光标坐标。 */
  private coordinate: DrawCoordinateService
  /** 区域状态管理器，用于判断并切换正文、页眉、页脚等编辑区域。 */
  private zone: Zone
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>

  private elementList: IElement[]
  private rowList: IRow[]
  private positionList: IElementPosition[]

  /** 初始化 Footer 实例并注入运行依赖。 */
  constructor(draw: Draw, data?: IElement[]) {
    this.draw = draw
    this.coordinate = draw.getCoordinate()
    this.zone = draw.getZone()
    this.options = draw.getOptions()
    // 初始化列表
    this.elementList = data || []
    this.rowList = []
    this.positionList = []
  }

  /**
   * 获取行列表。
   *
   * @returns 页脚行列表
   */
  public getRowList(): IRow[] {
    return this.rowList
  }

  /**
   * 设置元素列表。
   *
   * @param elementList - 页脚元素列表
   */
  public setElementList(elementList: IElement[]) {
    this.elementList = elementList
  }

  /**
   * 获取元素列表。
   *
   * @returns 页脚元素列表
   */
  public getElementList(): IElement[] {
    return this.elementList
  }

  /**
   * 获取位置列表。
   *
   * @returns 元素位置列表
   */
  public getPositionList(): IElementPosition[] {
    return this.positionList
  }

  /**
   * 计算页脚布局。
   *
   * 包括行列表和位置列表的计算。
   */
  public compute() {
    // 恢复初始状态
    this.recovery()
    // 计算行列表
    this._computeRowList()
    this.positionList = this._createPositionList(0, this.draw.getHeight())
  }

  /** 连页高度变化后，同步页脚位置到真实页面底部。 */
  public syncPositionForPage(pageNo = 0) {
    this.positionList = this._createPositionList(
      pageNo,
      this.draw.getPageCanvasHost().getPageHeight(pageNo)
    )
  }

  /**
   * 恢复初始状态。
   *
   * 清空行列表和位置列表。
   */
  public recovery() {
    this.rowList = []
    this.positionList = []
  }

  /**
   * 计算页脚行列表。
   *
   * 使用布局计算器计算页脚的行列表。
   */
  private _computeRowList() {
    const innerWidth = this.draw.getInnerWidth()
    this.rowList = this.draw.computeRowList({
      innerWidth,
      elementList: this.elementList,
      isFloat: true
    })
  }

  /**
   * 计算页脚位置列表。
   *
   * 计算每个元素的位置信息。
   */
  private _createPositionList(pageNo: number, pageHeight: number) {
    const positionList: IElementPosition[] = []
    // 获取页脚底部位置
    const footerBottom = this.getFooterBottom()
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    const startX = margins[3]
    // 计算起始 Y 坐标（页面底部 - 页脚底部距离 - 页脚高度）
    const footerHeight = this.getHeight()
    const startY = pageHeight - footerBottom - footerHeight
    // 计算位置列表
    this.coordinate.computePageRowPosition({
      positionList,
      rowList: this.rowList,
      pageNo,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth,
      zone: EditorZone.FOOTER
    })
    return positionList
  }

  public getFooterBottom(): number {
    const {
      footer: { bottom, disabled },
      scale
    } = this.options
    if (disabled) return 0
    return Math.floor(bottom * scale)
  }

  public getMaxHeight(): number {
    const {
      footer: { maxHeightRadio }
    } = this.options
    const height = this.draw.getHeight()
    return Math.floor(height * maxHeightRadioMapping[maxHeightRadio])
  }

  public getHeight(): number {
    const maxHeight = this.getMaxHeight()
    const rowHeight = this.getRowHeight()
    return rowHeight > maxHeight ? maxHeight : rowHeight
  }

  public getRowHeight(): number {
    return this.rowList.reduce((pre, cur) => pre + cur.height, 0)
  }

  public getExtraHeight(): number {
    // 页脚下边距 + 实际高 - 页面上边距
    const margins = this.draw.getMargins()
    const footerHeight = this.getHeight()
    const footerBottom = this.getFooterBottom()
    const extraHeight = footerBottom + footerHeight - margins[2]
    return extraHeight <= 0 ? 0 : extraHeight
  }

  /**
   * 渲染页脚。
   *
   * @param ctx - 画布上下文
   * @param pageNo - 页码
   */
  public render(
    ctx: CanvasRenderingContext2D,
    pageNo: number,
    /** 页面高度，用于计算分页模式下的可视区域。 */
    options: { pageHeight?: number } = {}
  ) {
    ctx.save()
    ctx.globalAlpha = this.zone.isFooterActive()
      ? 1
      : this.options.footer.inactiveAlpha
    const innerWidth = this.draw.getInnerWidth()
    const maxHeight = this.getMaxHeight()
    // 超出最大高度不渲染
    const rowList: IRow[] = []
    let curRowHeight = 0
    for (let r = 0; r < this.rowList.length; r++) {
      const row = this.rowList[r]
      if (curRowHeight + row.height > maxHeight) {
        break
      }
      rowList.push(row)
      curRowHeight += row.height
    }
    const positionList =
      options.pageHeight !== undefined
        ? this._createPositionList(pageNo, options.pageHeight)
        : this.positionList
    this.draw.drawRow(ctx, {
      elementList: this.elementList,
      positionList,
      rowList,
      pageNo,
      startIndex: 0,
      innerWidth,
      zone: EditorZone.FOOTER
    })
    ctx.restore()
  }
}
