import { maxHeightRadioMapping } from '../../../dataset/constant/Common'
import { EditorZone } from '../../../dataset/enum/Editor'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { Zone } from '../../zone/Zone'
import { Draw } from '../Draw'
import type { DrawCoordinateService } from '../coordinate/DrawCoordinateService'

export class Footer {
  private draw: Draw
  private coordinate: DrawCoordinateService
  private zone: Zone
  private options: DeepRequired<IEditorOption>

  private elementList: IElement[]
  private rowList: IRow[]
  private positionList: IElementPosition[]

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
   * 使用位置管理器计算每个元素的位置信息。
   */
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
