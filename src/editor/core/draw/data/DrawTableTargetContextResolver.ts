import { ElementType } from '../../../dataset/enum/Element'
import { ITableInfoByEvent } from '../../../interface/Event'
import { IElement } from '../../../interface/Element'
import { ICurrentPosition, IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import type { Draw } from '../Draw'
import { resolveTableCellByIndex } from '../../table/utils/TableCellTraversal'
import { DrawTableTargetSnapshotResolver } from './DrawTableTargetSnapshotResolver'
import {
  IDrawResolvedPreviousPagingTable,
  IDrawResolvedControlBoundaryElements,
  IDrawResolvedRangeBoundaryElements,
  IDrawResolvedRangeContextBoundaryElements,
  IDrawResolvedTableCell,
  IDrawResolvedTableContext,
  IDrawResolvedTableTarget,
  IDrawResolvedTableTd
} from './DrawTargetResolverTypes'

export class DrawTableTargetContextResolver {
  constructor(
    private readonly draw: Draw,
    private readonly snapshot: DrawTableTargetSnapshotResolver
  ) {}

  public resolveRangeBoundaryElements(options: {
    range?: IRange
    elementList?: IElement[]
  } = {}): IDrawResolvedRangeBoundaryElements {
    const range = options.range || this.draw.getRange().getEditBoundaryRange()
    const elementList =
      options.elementList || this.draw.getObjectResolver().getElementList()
    return {
      range,
      elementList,
      startElement: elementList[range.startIndex] || null,
      endElement: elementList[range.endIndex] || null
    }
  }

  public resolveRangeAnchorElement(options: {
    range?: IRange
    elementList?: IElement[]
  } = {}): IElement | null {
    return this.resolveRangeBoundaryElements(options).endElement
  }

  public resolveControlBoundaryElements(options: {
    range?: IRange
    elementList?: IElement[]
  } = {}): IDrawResolvedControlBoundaryElements | null {
    const { range, elementList, startElement } =
      this.resolveRangeBoundaryElements(options)
    const controlId = startElement?.controlId
    if (!controlId) return null

    // 控件边界统一在这里扩展，业务层只拿结果，不再自己左右扫 controlId。
    let startIndex = range.startIndex
    while (startIndex > 0 && elementList[startIndex - 1]?.controlId === controlId) {
      startIndex--
    }

    let endIndex = range.endIndex
    while (
      endIndex + 1 < elementList.length &&
      elementList[endIndex + 1]?.controlId === controlId
    ) {
      endIndex++
    }

    return {
      range,
      elementList,
      controlId,
      startIndex,
      endIndex,
      startElement: elementList[startIndex] || null,
      endElement: elementList[endIndex] || null
    }
  }

  public resolveRangeElement(options: {
    range?: IRange
    elementList?: IElement[]
    anchor?: 'start' | 'end'
    offset?: number
  } = {}): IElement | null {
    const { anchor = 'start', offset = 0 } = options
    const { range, elementList, startElement, endElement } =
      this.resolveRangeBoundaryElements(options)
    // 统一按 range 的起止边界取目标元素，offset 只负责取相邻元素。
    const index =
      (anchor === 'end' ? range.endIndex : range.startIndex) + offset
    if (index < 0) return null
    if (offset === 0) {
      return anchor === 'end' ? endElement : startElement
    }
    return elementList[index] || null
  }

  public resolveRangeContextBoundaryElements(payload: {
    isCollapsed: boolean
    startIndex: number
    endIndex: number
    elementList: IElement[]
    selectedElementList: IElement[]
  }): IDrawResolvedRangeContextBoundaryElements | null {
    const { isCollapsed, startIndex, endIndex, elementList, selectedElementList } =
      payload
    const startSourceElement =
      (isCollapsed ? elementList[startIndex] : selectedElementList[0]) ||
      elementList[startIndex] ||
      null
    const endSourceElement =
      (isCollapsed
        ? elementList[endIndex]
        : selectedElementList[selectedElementList.length - 1]) ||
      elementList[Math.max(0, endIndex - 1)] ||
      elementList[endIndex] ||
      null
    if (!startSourceElement || !endSourceElement) {
      return null
    }
    return {
      startSourceElement,
      endSourceElement
    }
  }

  public resolveTableIndexById(tableId: string): number {
    const originalElementList = this.draw
      .getObjectResolver()
      .getOriginalElementList()
    return originalElementList.findIndex(element => {
      if (element.type !== ElementType.TABLE || !element.id) return false
      return (
        element.id === tableId ||
        this.snapshot.isSameLogicalTable(element.id, tableId)
      )
    })
  }

  public resolveOriginalTableById(
    tableId: string
  ): { index: number; element: IElement } | null {
    const index = this.resolveTableIndexById(tableId)
    return this.resolveOriginalTableByIndex(index)
  }

  public resolveLogicalTableById(
    tableId: string | null | undefined,
    options: { normalize?: boolean } = {}
  ): { index: number; element: IElement } | null {
    const tableIndex = this.snapshot.resolveLogicalTableIndex(tableId) ?? -1
    return this.resolveOriginalTableByIndex(tableIndex, options)
  }

  public resolveOriginalTableByIndex(
    index: number,
    options: { normalize?: boolean } = {}
  ): { index: number; element: IElement } | null {
    if (!~index) return null
    const element = this.draw.getObjectResolver().getOriginalElement(index)
    if (!this.isUsableTable(element)) return null
    if (options.normalize) {
      this.draw.getTableParticle().computeRowColInfo(element)
    }
    return {
      index,
      element
    }
  }

  public resolveContextTable(options: {
    tableId?: string
    range?: IRange
    positionContext?: IPositionContext
    normalize?: boolean
  } = {}): IDrawResolvedTableContext | null {
    const positionContext =
      options.positionContext || this.draw.getCoordinate().getPositionContext()
    const range = options.range || this.draw.getRange().getEditBoundaryRange()
    const rangeTableId = options.tableId || range.tableId
    if (!positionContext.isTable && !rangeTableId) return null

    let tableIndex = positionContext.index
    let element =
      tableIndex !== undefined
        ? this.draw.getObjectResolver().getOriginalElement(tableIndex)
        : undefined

    if (options.tableId && element?.id !== options.tableId) {
      const table = this.resolveOriginalTableById(options.tableId)
      tableIndex = table?.index ?? -1
      element = table?.element
    }

    if (!this.isUsableTable(element)) {
      const tableId = positionContext.tableId || rangeTableId
      const table = tableId ? this.resolveOriginalTableById(tableId) : null
      tableIndex = table?.index ?? -1
      element = table?.element
    }

    if (!this.isUsableTable(element) || tableIndex === undefined || !~tableIndex) {
      return null
    }

    if (options.normalize) {
      this.draw.getTableParticle().computeRowColInfo(element)
    }

    return {
      positionContext,
      index: tableIndex,
      element,
      trIndex: positionContext.trIndex ?? range.startTrIndex,
      tdIndex: positionContext.tdIndex ?? range.startTdIndex,
      tableId: element.id || positionContext.tableId || rangeTableId
    }
  }

  public resolveTableTarget(options: {
    hitTableInfo?: ITableInfoByEvent | null
    positionContext?: IPositionContext
  } = {}): IDrawResolvedTableTarget | null {
    const hitTableInfo = options.hitTableInfo || null
    if (hitTableInfo?.element) {
      return {
        element: hitTableInfo.element,
        trIndex: hitTableInfo.trIndex,
        tdIndex: hitTableInfo.tdIndex
      }
    }

    const tableContext = this.resolveContextTable({
      positionContext: options.positionContext,
      range: {
        startIndex: -1,
        endIndex: -1
      }
    })
    if (!tableContext) return null
    return {
      element: tableContext.element,
      trIndex: tableContext.trIndex ?? null,
      tdIndex: tableContext.tdIndex ?? null
    }
  }

  public resolveElementByPositionContext(
    positionContext: IPositionContext | ICurrentPosition
  ): { element: IElement | null; tableCell: IDrawResolvedTableTd | null } {
    if (positionContext.isTable) {
      const tableCell = this.resolveActiveLogicalTableTd({ positionContext })
      const tdValueIndex =
        'tdValueIndex' in positionContext
          ? positionContext.tdValueIndex
          : undefined
      return {
        element:
          tdValueIndex !== undefined
            ? tableCell?.td.value[tdValueIndex] || null
            : null,
        tableCell
      }
    }
    return {
      element:
        positionContext.index !== undefined
          ? this.draw.getObjectResolver().getOriginalElement(positionContext.index) ||
            null
          : null,
      tableCell: null
    }
  }

  public resolveActiveLogicalTableCell(options: {
    range?: IRange
    positionContext?: IPositionContext | ICurrentPosition
  } = {}): IDrawResolvedTableCell | null {
    const positionContext =
      options.positionContext || this.draw.getCoordinate().getPositionContext()
    const activeSlice =
      this.snapshot.resolveTableSliceByPositionContext(positionContext)
    if (activeSlice) {
      return {
        tableIndex: activeSlice.logicalTableIndex,
        trIndex: activeSlice.logicalTrIndex,
        tdIndex: activeSlice.logicalTdIndex
      }
    }

    if (
      positionContext.isTable &&
      positionContext.index !== undefined &&
      positionContext.trIndex !== undefined &&
      positionContext.tdIndex !== undefined
    ) {
      return {
        tableIndex: positionContext.index,
        trIndex: positionContext.trIndex,
        tdIndex: positionContext.tdIndex
      }
    }

    const range = options.range || this.draw.getRange().getEditBoundaryRange()
    if (
      range.tableId &&
      range.startTrIndex !== undefined &&
      range.startTdIndex !== undefined
    ) {
      const tableIndex = this.snapshot.resolveLogicalTableIndex(range.tableId) ?? -1
      if (~tableIndex) {
        return {
          tableIndex,
          trIndex: range.startTrIndex,
          tdIndex: range.startTdIndex
        }
      }
    }

    return null
  }

  public resolveLogicalTableCellByPositionContext(
    positionContext: IPositionContext | ICurrentPosition
  ): IDrawResolvedTableCell | null {
    return this.resolveActiveLogicalTableCell({
      positionContext,
      range: {
        startIndex: -1,
        endIndex: -1
      }
    })
  }

  public resolveActiveLogicalTableTd(options: {
    range?: IRange
    positionContext?: IPositionContext | ICurrentPosition
  } = {}): IDrawResolvedTableTd | null {
    const logicalCell = this.resolveActiveLogicalTableCell(options)
    if (!logicalCell) return null
    return this.resolveOriginalTableTdByIndex({
      tableIndex: logicalCell.tableIndex,
      trIndex: logicalCell.trIndex,
      tdIndex: logicalCell.tdIndex
    })
  }

  public getLogicalCellSliceList(
    tableIndex: number,
    trIndex: number,
    tdIndex: number
  ) {
    const tableCell = this.resolveOriginalTableTdByIndex({
      tableIndex,
      trIndex,
      tdIndex
    })
    if (!tableCell?.table.id || !tableCell.tr.id || !tableCell.td.id) {
      return []
    }
    return this.snapshot.getCellSlicesByLogicalCell({
      tableId: tableCell.table.id,
      trId: tableCell.tr.id,
      tdId: tableCell.td.id
    })
  }

  public resolveOriginalTableTdByIndex(payload: {
    tableIndex: number
    trIndex: number
    tdIndex: number
  }): IDrawResolvedTableTd | null {
    return this.resolveTableTdByIndex({
      elementList: this.draw.getObjectResolver().getOriginalElementList(),
      tableIndex: payload.tableIndex,
      trIndex: payload.trIndex,
      tdIndex: payload.tdIndex
    })
  }

  public resolveTableTdByIndex(payload: {
    elementList: IElement[]
    tableIndex: number
    trIndex: number
    tdIndex: number
  }): IDrawResolvedTableTd | null {
    const table = payload.elementList[payload.tableIndex]
    const cell = resolveTableCellByIndex({
      tableElement: table,
      tableIndex: payload.tableIndex,
      trIndex: payload.trIndex,
      tdIndex: payload.tdIndex
    })
    if (!cell) return null
    return {
      tableIndex: payload.tableIndex,
      trIndex: payload.trIndex,
      tdIndex: payload.tdIndex,
      table: cell.tableElement,
      tr: cell.tr,
      td: cell.td
    }
  }

  public resolvePreviousPagingTable(
    positionContext: IPositionContext
  ): IDrawResolvedPreviousPagingTable | null {
    const currentTable = this.resolveContextTable({
      positionContext,
      range: {
        startIndex: -1,
        endIndex: -1
      }
    })
    if (
      !currentTable?.element.pagingId ||
      (currentTable.element.pagingIndex ?? 0) <= 0
    ) {
      return null
    }

    for (let i = currentTable.index - 1; i >= 0; i--) {
      const previousElement = this.draw.getObjectResolver().getOriginalElement(i)
      if (previousElement?.pagingId === currentTable.element.pagingId) {
        return {
          currentIndex: currentTable.index,
          currentElement: currentTable.element,
          previousIndex: i,
          previousElement
        }
      }
    }

    return null
  }

  private isUsableTable(element: IElement | undefined): element is IElement {
    return element?.type === ElementType.TABLE && !!element.trList?.length
  }
}
