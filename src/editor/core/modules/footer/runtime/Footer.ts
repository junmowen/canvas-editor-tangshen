import { maxHeightRadioMapping } from '../../../../dataset/constant/Common'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { DeepRequired } from '../../../../interface/Common'
import {
  IEditorOption,
  IHeaderFooterPageScopeData
} from '../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import {
  ensureHeaderFooterScopedElementList,
  resolveHeaderFooterScopedElementList
} from '../../page-setup/runtime/HeaderFooterPageScope'
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

  private pageScopes: IHeaderFooterPageScopeData[]
  private scopedRowList: Array<{
    elementList: IElement[]
    rowList: IRow[]
  }>

  /** 初始化 Footer 实例并注入运行依赖。 */
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
   * @returns 页脚行列表
   */
  public getRowList(pageNo = 0): IRow[] {
    const elementList = this.getElementList(pageNo)
    return (
      this.scopedRowList.find(item => item.elementList === elementList)
        ?.rowList || []
    )
  }

  /** 获取全部已排版的页脚行列表，用于 worker 支持性校验。 */
  public getAllRowList(): IRow[][] {
    return this.scopedRowList.map(item => item.rowList)
  }

  /** 设置按页面作用域划分的页脚数据。 */
  public setPageScopes(pageScopes?: IHeaderFooterPageScopeData[]) {
    this.pageScopes = pageScopes || []
  }

  /** 获取按页面作用域划分的页脚数据。 */
  public getPageScopes(): IHeaderFooterPageScopeData[] {
    return this.pageScopes
  }

  /**
   * 获取元素列表。
   *
   * @returns 页脚元素列表
   */
  public getElementList(pageNo?: number): IElement[] {
    return resolveHeaderFooterScopedElementList(
      this.pageScopes,
      pageNo ?? this.zone.getZonePageNo()
    )
  }

  /** 确保指定页存在可编辑页脚元素列表。 */
  public ensureElementList(pageNo = this.zone.getZonePageNo()): IElement[] {
    return ensureHeaderFooterScopedElementList(this.pageScopes, pageNo)
  }

  /**
   * 获取指定页页脚位置列表，非首页按当前页边距即时重建。
   *
   * @returns 元素位置列表
   */
  public getPositionList(
    pageNo = 0,
    pageHeight = this.draw.getHeight()
  ): IElementPosition[] {
    return this._createPositionList(pageNo, pageHeight)
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
   * 计算页脚行列表。
   *
   * 使用布局计算器计算页脚的行列表。
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

  /** 计算单个页脚元素列表的行列表。 */
  private _computeElementRowList(elementList: IElement[]) {
    const innerWidth = this.draw.getInnerWidth()
    return this.draw.computeRowList({
      innerWidth,
      elementList,
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
    // 页脚位置按目标页边距计算，镜像页边距下页脚内容需要随奇偶页切换。
    const innerWidth = this.draw.getInnerWidth(pageNo)
    const margins = this.draw.getMargins(pageNo)
    const startX = margins[3]
    // 计算起始 Y 坐标（页面底部 - 页脚底部距离 - 页脚高度）
    const footerHeight = this.getHeight(pageNo)
    const startY = pageHeight - footerBottom - footerHeight
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

  public getHeight(pageNo = 0): number {
    const maxHeight = this.getMaxHeight()
    const rowHeight = this.getRowHeight(pageNo)
    return rowHeight > maxHeight ? maxHeight : rowHeight
  }

  public getRowHeight(pageNo = 0): number {
    return this.getRowList(pageNo).reduce((pre, cur) => pre + cur.height, 0)
  }

  public getExtraHeight(pageNo = 0): number {
    // 页脚下边距 + 实际高 - 页面上边距
    const margins = this.draw.getMargins(pageNo)
    const footerHeight = this.getHeight(pageNo)
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
    // 页脚绘制宽度跟随当前页，保证导出和非当前页渲染不会复用首页边距。
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
    const positionList = this.getPositionList(
      pageNo,
      options.pageHeight ?? this.draw.getHeight()
    )
    const elementList = this.getElementList(pageNo)
    this.draw.drawRow(ctx, {
      elementList,
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
