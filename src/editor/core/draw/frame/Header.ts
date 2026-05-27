import { maxHeightRadioMapping } from '../../../dataset/constant/Common'
import { EditorZone } from '../../../dataset/enum/Editor'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { pickSurroundElementList } from '../../../utils/element'
import { Zone } from '../../zone/Zone'
import { Draw } from '../Draw'
import type { DrawCoordinateService } from '../coordinate/DrawCoordinateService'

/**
 * 页眉框架。
 *
 * 负责页眉区域的计算、布局和渲染。
 */
export class Header {
  /** Draw 门面对象 */
  private draw: Draw
  /** 坐标服务 */
  private coordinate: DrawCoordinateService
  /** 区域管理器 */
  private zone: Zone
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>
  /** 页眉元素列表 */
  private elementList: IElement[]
  /** 行列表 */
  private rowList: IRow[]
  /** 位置列表 */
  private positionList: IElementPosition[]

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   * @param data - 初始元素列表（可选）
   */
  constructor(draw: Draw, data?: IElement[]) {
    this.draw = draw
    this.coordinate = draw.getCoordinate()
    this.zone = draw.getZone()
    this.options = draw.getOptions()
    // 初始化元素列表
    this.elementList = data || []
    this.rowList = []
    this.positionList = []
  }

  /**
   * 获取行列表。
   *
   * @returns 页眉行列表
   */
  public getRowList(): IRow[] {
    return this.rowList
  }

  /**
   * 设置元素列表。
   *
   * @param elementList - 页眉元素列表
   */
  public setElementList(elementList: IElement[]) {
    this.elementList = elementList
  }

  /**
   * 获取元素列表。
   *
   * @returns 页眉元素列表
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
   * 计算页眉布局。
   *
   * 包括行列表和位置列表的计算。
   */
  public compute() {
    // 恢复状态
    this.recovery()
    // 计算行列表
    this._computeRowList()
    // 计算位置列表
    this._computePositionList()
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
   * 计算页眉行列表。
   *
   * 使用布局计算器计算页眉的行列表。
   */
  private _computeRowList() {
    // 获取内部宽度和边距
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    // 获取包围元素列表
    const surroundElementList = pickSurroundElementList(this.elementList)
    // 计算行列表
    this.rowList = this.draw.computeRowList({
      startX: margins[3],
      startY: this.getHeaderTop(),
      innerWidth,
      elementList: this.elementList,
      surroundElementList,
      isFloat: true
    })
  }

  /**
   * 计算页眉位置列表。
   *
   * 计算每个元素的位置信息。
   */
  /**
   * 计算页眉位置列表。
   *
   * 使用位置管理器计算每个元素的位置信息。
   */
  private _computePositionList() {
    // 获取页眉顶部位置
    const headerTop = this.getHeaderTop()
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    const startX = margins[3]
    const startY = headerTop
    // 计算位置列表
    this.coordinate.computePageRowPosition({
      positionList: this.positionList,
      rowList: this.rowList,
      pageNo: 0,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth,
      zone: EditorZone.HEADER
    })
  }

  public getHeaderTop(): number {
    const {
      header: { top, disabled },
      scale
    } = this.options
    if (disabled) return 0
    return Math.floor(top * scale)
  }

  public getMaxHeight(): number {
    const {
      header: { maxHeightRadio }
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
    // 页眉上边距 + 实际高 - 页面上边距
    const margins = this.draw.getMargins()
    const headerHeight = this.getHeight()
    const headerTop = this.getHeaderTop()
    const extraHeight = headerTop + headerHeight - margins[0]
    return extraHeight <= 0 ? 0 : extraHeight
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    ctx.save()
    ctx.globalAlpha = this.zone.isHeaderActive()
      ? 1
      : this.options.header.inactiveAlpha
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
    this.draw.drawRow(ctx, {
      elementList: this.elementList,
      positionList: this.positionList,
      rowList,
      pageNo,
      startIndex: 0,
      innerWidth,
      zone: EditorZone.HEADER
    })
    ctx.restore()
  }
}
