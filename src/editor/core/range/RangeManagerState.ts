import { RangeManagerBase } from './RangeManagerBase'
import { ZERO } from '../../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../../dataset/constant/Element'
import { IElement, IElementPosition } from '../../interface/Element'
import { IRange, IRangeElementStyle } from '../../interface/Range'
import { getAnchorElement } from '../../utils/element'
import { sliceSelectionContent } from './utils/resolveSelectionContent'
import { IGetTableSelectionRenderRangePayload, ITableSelectionRenderRange } from '../table/selection/TableSelectionTypes'

/**
 * RangeManager 状态模块，负责内部 range、默认样式、公开投影和选区内容读取。
 */
export class RangeManagerState extends RangeManagerBase {
  /** 获取内部原始编辑范围。 */
  public getRange(): IRange {
    return this.range
  }

  /** 获取用于编辑操作的内部边界范围。 */
  public getEditBoundaryRange(): IRange {
    return this.range
  }

  /** 设置无选区输入时继承的默认样式。 */
  public setDefaultStyle(style: IRangeElementStyle | null) {
    if (!style) {
      this.defaultStyle = null
    } else {
      this.defaultStyle = {
        ...this.defaultStyle,
        ...style
      }
    }
  }

  /** 获取当前默认输入样式。 */
  public getDefaultStyle(): IRangeElementStyle | null {
    return this.defaultStyle
  }

  /** 获取指定锚点元素并叠加默认输入样式。 */
  public getRangeAnchorStyle(
    elementList: IElement[],
    anchorIndex: number
  ): IElement | null {
    const anchorElement = getAnchorElement(elementList, anchorIndex)
    if (!anchorElement) return null
    return {
      ...anchorElement,
      ...this.defaultStyle
    }
  }

  /** 判断给定范围是否与当前内部 range 不一致。 */
  public getIsRangeChange(
    startIndex: number,
    endIndex: number,
    tableId?: string,
    startTdIndex?: number,
    endTdIndex?: number,
    startTrIndex?: number,
    endTrIndex?: number
  ): boolean {
    return (
      this.range.startIndex !== startIndex ||
      this.range.endIndex !== endIndex ||
      this.range.tableId !== tableId ||
      this.range.startTdIndex !== startTdIndex ||
      this.range.endTdIndex !== endTdIndex ||
      this.range.startTrIndex !== startTrIndex ||
      this.range.endTrIndex !== endTrIndex
    )
  }

  /** 判断当前 range 是否为闭合光标。 */
  public getIsCollapsed(): boolean {
    const { startIndex, endIndex } = this.range
    return startIndex === endIndex
  }

  /** 判断当前 range 是否为有效非闭合选区。 */
  public getIsSelection(): boolean {
    const { startIndex, endIndex } = this.range
    if (!~startIndex && !~endIndex) return false
    return startIndex !== endIndex
  }

  /** 获取当前选区对应的真实内容切片范围。 */
  public getSelectionContentRange() {
    // 复制、剪切、选区位置列表都走这条内容范围主链。
    return this.selectionProjectionService.getSelectionContentRange()
  }

  /** 解析当前活动表格单元格的逻辑位置。 */
  private resolveActiveLogicalTableCell() {
    return this.draw.getTargetResolver().resolveActiveLogicalTableCell({
      range: this.range,
      positionContext: this.coordinate.getPositionContext()
    })
  }

  /** 获取当前表格单元格的前置零宽占位偏移。 */
  protected getActiveTableLeadingOffset(): number {
    const logicalCell = this.resolveActiveLogicalTableCell()
    if (!logicalCell) {
      return 0
    }
    const td = this.draw.getTargetResolver().resolveActiveLogicalTableTd({
      range: this.range,
      positionContext: this.coordinate.getPositionContext()
    })?.td
    return td?.value?.[0]?.value === ZERO && td.value[1] ? 1 : 0
  }

  /** 获取当前表格分页碎片相对逻辑单元格的偏移。 */
  protected getActiveTableFragmentOffset(
    leadingOffset: number,
    cursorPosition?: IElementPosition | null
  ): number {
    const targetResolver = this.draw.getTargetResolver()
    const activeSlice = targetResolver.resolveTableSliceByPositionContext(
      this.coordinate.getPositionContext()
    )
    const logicalCell = this.resolveActiveLogicalTableCell()
    if (!logicalCell || !cursorPosition) {
      return 0
    }
    const activeTd = this.draw.getTargetResolver().resolveActiveLogicalTableTd({
      range: this.range,
      positionContext: this.coordinate.getPositionContext()
    })
    const td = activeTd?.td
    if (!td || td.rowspan > 1 || td.colspan > 1) {
      return 0
    }
    const table = activeTd?.table
    const tr = activeTd?.tr
    const logicalTd = activeTd?.td
    const logicalCellIdentity =
      table?.id && tr?.id && logicalTd?.id
        ? {
            tableId: table.id,
            trId: tr.id,
            tdId: logicalTd.id
          }
        : null
    const sliceList =
      logicalCellIdentity
        ? targetResolver.getCellSlicesByLogicalCell(logicalCellIdentity)
        : []
    if (sliceList.length <= 1) {
      return 0
    }
    const resolvedActiveSlice =
      (logicalCellIdentity
        ? targetResolver.resolveCellSliceByAbsoluteIndex({
            ...logicalCellIdentity,
            absoluteIndex: cursorPosition.index
          })
        : null) ||
      (logicalCellIdentity
        ? targetResolver.resolveCellSliceByPageNo({
            ...logicalCellIdentity,
            pageNo: cursorPosition.pageNo
          })
        : null) ||
      activeSlice ||
      null
    if (!resolvedActiveSlice) {
      return 0
    }
    return Math.max(0, resolvedActiveSlice.absoluteStart - leadingOffset)
  }

  /** 获取对外公开的光标位置，并统一修正表格偏移。 */
  public getPublicCursorPosition(): IElementPosition | null {
    // 对外公开光标统一从投影层读取，
    // 避免命令层和渲染层各自解释 collapsed table cursor。
    return this.selectionProjectionService.getPublicCursorPosition()
  }

  /** 获取对外公开的 range，并统一修正表格逻辑索引。 */
  public getPublicRange(): IRange {
    // 对外公开的 command.getRange() 统一从投影层读取。
    return this.selectionProjectionService.getPublicRange()
  }

  /** 获取表格渲染选区使用的局部范围。 */
  public getRenderSelectionRange(
    payload: IGetTableSelectionRenderRangePayload = {}
  ): ITableSelectionRenderRange | null {
    return this.selectionProjectionService.getRenderSelectionRange(payload)
  }

  /** 获取当前选区的元素切片。 */
  public getSelection(): IElement[] | null {
    const selectionContentRange = this.getSelectionContentRange()
    if (!selectionContentRange) return null
    const elementList = this.draw.getObjectResolver().getElementList()
    return sliceSelectionContent(elementList, selectionContentRange)
  }

  /** 获取当前选区元素列表，兼容跨行列单元格选择。 */
  public getSelectionElementList(): IElement[] | null {
    if (this.range.isCrossRowCol) {
      const rowCol = this.draw.getTableParticle().getRangeRowCol()
      if (!rowCol) return null
      const elementList: IElement[] = []
      for (let r = 0; r < rowCol.length; r++) {
        const row = rowCol[r]
        for (let c = 0; c < row.length; c++) {
          const col = row[c]
          elementList.push(...col.value)
        }
      }
      return elementList
    }
    return this.getSelection()
  }

  /** 获取当前选区中的文本类元素。 */
  public getTextLikeSelection(): IElement[] | null {
    const selection = this.getSelection()
    if (!selection) return null
    return selection.filter(
      s => !s.type || TEXTLIKE_ELEMENT_TYPE.includes(s.type)
    )
  }

  /** 获取已经投影到公开语义的活动范围。 */
  protected getProjectedActiveRange(): IRange | null {
    const publicRange = this.getPublicRange()
    const { startIndex, endIndex } = publicRange
    if (!~startIndex && !~endIndex) {
      return null
    }
    const selectionContentRange = this.getSelectionContentRange()
    if (!selectionContentRange) {
      return publicRange
    }
    return {
      ...publicRange,
      startIndex: selectionContentRange.startIndex,
      endIndex: selectionContentRange.endIndex
    }
  }

  /** 获取当前选区元素列表中的文本类元素。 */
  public getTextLikeSelectionElementList(): IElement[] | null {
    const selection = this.getSelectionElementList()
    if (!selection) return null
    return selection.filter(
      s => !s.type || TEXTLIKE_ELEMENT_TYPE.includes(s.type)
    )
  }

  // 获取光标所选位置行信息
}
