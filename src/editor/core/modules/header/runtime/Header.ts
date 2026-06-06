import { maxHeightRadioMapping } from '../../../../dataset/constant/Common'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { DeepRequired } from '../../../../interface/Common'
import {
  IEditorOption,
  IHeaderFooterPageScopeData
} from '../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import { pickSurroundElementList } from '../../../../utils/elementLayout'
import {
  ensureHeaderFooterScopedElementList,
  resolveHeaderFooterScopedElementList
} from '../../page-setup/runtime/HeaderFooterPageScope'
import { Zone } from '../../../runtime/zone/Zone'
import { Draw } from '../../../draw/Draw'
import type { DrawCoordinateService } from '../../../draw/coordinate/DrawCoordinateService'

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
  /** 按页面作用域划分的页眉元素列表。 */
  private pageScopes: IHeaderFooterPageScopeData[]
  /** 作用域元素列表对应的行列表缓存。 */
  private scopedRowList: Array<{
    elementList: IElement[]
    rowList: IRow[]
  }>

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   */
  constructor(draw: Draw) {
    this.draw = draw
    this.coordinate = draw.getCoordinate()
    this.zone = draw.getZone()
    this.options = draw.getOptions()
    this.pageScopes = []
    this.scopedRowList = []
  }

  /**
   * 获取行列表。
   *
   * @returns 页眉行列表
   */
  public getRowList(pageNo = 0): IRow[] {
    const elementList = this.getElementList(pageNo)
    return (
      this.scopedRowList.find(item => item.elementList === elementList)
        ?.rowList || []
    )
  }

  /** 获取全部已排版的页眉行列表，用于 worker 支持性校验。 */
  public getAllRowList(): IRow[][] {
    return this.scopedRowList.map(item => item.rowList)
  }

  /** 设置按页面作用域划分的页眉数据。 */
  public setPageScopes(pageScopes?: IHeaderFooterPageScopeData[]) {
    this.pageScopes = pageScopes || []
  }

  /** 获取按页面作用域划分的页眉数据。 */
  public getPageScopes(): IHeaderFooterPageScopeData[] {
    return this.pageScopes
  }

  /**
   * 获取元素列表。
   *
   * @returns 页眉元素列表
   */
  public getElementList(pageNo?: number): IElement[] {
    return resolveHeaderFooterScopedElementList(
      this.pageScopes,
      pageNo ?? this.zone.getZonePageNo()
    )
  }

  /** 确保指定页存在可编辑页眉元素列表。 */
  public ensureElementList(pageNo = this.zone.getZonePageNo()): IElement[] {
    return ensureHeaderFooterScopedElementList(this.pageScopes, pageNo)
  }

  /**
   * 获取指定页页眉位置列表。
   *
   * @returns 元素位置列表
   */
  public getPositionList(pageNo = 0): IElementPosition[] {
    return this._createPositionList(pageNo)
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
  }

  /**
   * 恢复初始状态。
   *
   * 清空行列表和位置列表。
   */
  public recovery() {
    this.scopedRowList = []
  }

  /**
   * 计算页眉行列表。
   *
   * 使用布局计算器计算页眉的行列表。
   */
  private _computeRowList() {
    this.pageScopes.forEach(scopeData => {
      if (
        this.scopedRowList.some(item => item.elementList === scopeData.elementList)
      ) {
        return
      }
      this.scopedRowList.push({
        elementList: scopeData.elementList,
        rowList: this._computeElementRowList(scopeData.elementList)
      })
    })
  }

  /** 计算单个页眉元素列表的行列表。 */
  private _computeElementRowList(elementList: IElement[]) {
    // 获取内部宽度和边距
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    // 获取包围元素列表
    const surroundElementList = pickSurroundElementList(elementList)
    // 计算行列表
    return this.draw.computeRowList({
      startX: margins[3],
      startY: this.getHeaderTop(),
      innerWidth,
      elementList,
      surroundElementList,
      isFloat: true
    })
  }

  /** 按页码创建页眉位置列表，镜像页边距下页眉正文起点需要随奇偶页切换。 */
  private _createPositionList(pageNo: number): IElementPosition[] {
    const positionList: IElementPosition[] = []
    // 获取页眉顶部位置
    const headerTop = this.getHeaderTop()
    const innerWidth = this.draw.getInnerWidth(pageNo)
    const margins = this.draw.getMargins(pageNo)
    const startX = margins[3]
    const startY = headerTop
    // 计算位置列表
    this.coordinate.computePageRowPosition({
      positionList,
      rowList: this.getRowList(pageNo),
      pageNo,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth,
      zone: EditorZone.HEADER
    })
    return positionList
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

  public getHeight(pageNo = 0): number {
    const maxHeight = this.getMaxHeight()
    const rowHeight = this.getRowHeight(pageNo)
    return rowHeight > maxHeight ? maxHeight : rowHeight
  }

  public getRowHeight(pageNo = 0): number {
    return this.getRowList(pageNo).reduce((pre, cur) => pre + cur.height, 0)
  }

  public getExtraHeight(pageNo = 0): number {
    // 页眉上边距 + 实际高 - 页面上边距
    const margins = this.draw.getMargins(pageNo)
    const headerHeight = this.getHeight(pageNo)
    const headerTop = this.getHeaderTop()
    const extraHeight = headerTop + headerHeight - margins[0]
    return extraHeight <= 0 ? 0 : extraHeight
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    ctx.save()
    ctx.globalAlpha = this.zone.isHeaderActive()
      ? 1
      : this.options.header.inactiveAlpha
    // 页眉绘制宽度跟随当前页，保证导出和非当前页渲染不会复用首页边距。
    const innerWidth = this.draw.getInnerWidth(pageNo)
    const maxHeight = this.getMaxHeight()
    // 超出最大高度不渲染
    const rowList: IRow[] = []
    let curRowHeight = 0
    const sourceRowList = this.getRowList(pageNo)
    for (let r = 0; r < sourceRowList.length; r++) {
      const row = sourceRowList[r]
      if (curRowHeight + row.height > maxHeight) {
        break
      }
      rowList.push(row)
      curRowHeight += row.height
    }
    const positionList = this.getPositionList(pageNo)
    const elementList = this.getElementList(pageNo)
    this.draw.drawRow(ctx, {
      elementList,
      positionList,
      rowList,
      pageNo,
      startIndex: 0,
      innerWidth,
      zone: EditorZone.HEADER
    })
    ctx.restore()
  }
}
