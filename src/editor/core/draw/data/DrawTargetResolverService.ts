import { ITableInfoByEvent } from '../../../interface/Event'
import { IElement } from '../../../interface/Element'
import { ICurrentPosition, IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import {
  ITableSnapshotCellContext,
  ITableSnapshotCellLocalRange
} from '../../table/layout/TableLayoutSnapshotAccessor'
import {
  ITableLayoutCellSlice,
  TLogicalTableCellKey
} from '../../table/layout/TableLayoutSnapshotTypes'
import type { Draw } from '../Draw'
import { DrawTableTargetContextResolver } from './DrawTableTargetContextResolver'
import { DrawTableTargetSnapshotResolver } from './DrawTableTargetSnapshotResolver'
import {
  IDrawResolvedControlBoundaryElements,
  IDrawResolvedPreviousPagingTable,
  IDrawResolvedRangeBoundaryElements,
  IDrawResolvedRangeContextBoundaryElements,
  IDrawResolvedTableCell,
  IDrawResolvedTableContext,
  IDrawResolvedTableTarget,
  IDrawResolvedTableTd
} from './DrawTargetResolverTypes'

export type {
  IDrawResolvedControlBoundaryElements,
  IDrawResolvedPreviousPagingTable,
  IDrawResolvedRangeBoundaryElements,
  IDrawResolvedRangeContextBoundaryElements,
  IDrawResolvedTableCell,
  IDrawResolvedTableContext,
  IDrawResolvedTableTarget,
  IDrawResolvedTableTd
} from './DrawTargetResolverTypes'

/**
 * Draw 当前目标统一解析入口。
 *
 * 对外保持一个 TargetResolver 门面；内部按职责拆成：
 * - contextResolver：positionContext/range/hit -> 当前表格/逻辑单元格
 * - snapshotResolver：table snapshot -> fragment slice/bounds/selection range
 */
export class DrawTargetResolverService {
  private readonly contextResolver: DrawTableTargetContextResolver
  private readonly snapshotResolver: DrawTableTargetSnapshotResolver

  constructor(draw: Draw) {
    this.snapshotResolver = new DrawTableTargetSnapshotResolver(draw)
    this.contextResolver = new DrawTableTargetContextResolver(
      draw,
      this.snapshotResolver
    )
  }

  public resolveRangeBoundaryElements(options: {
    range?: IRange
    elementList?: IElement[]
  } = {}): IDrawResolvedRangeBoundaryElements {
    return this.contextResolver.resolveRangeBoundaryElements(options)
  }

  public resolveRangeContextBoundaryElements(payload: {
    isCollapsed: boolean
    startIndex: number
    endIndex: number
    elementList: IElement[]
    selectedElementList: IElement[]
  }): IDrawResolvedRangeContextBoundaryElements | null {
    return this.contextResolver.resolveRangeContextBoundaryElements(payload)
  }

  public resolveRangeAnchorElement(options: {
    range?: IRange
    elementList?: IElement[]
  } = {}): IElement | null {
    return this.contextResolver.resolveRangeAnchorElement(options)
  }

  /**
   * 解析当前控件结构的完整边界。
   *
   * 这个入口统一给“当前控件/同组元素”的扫描逻辑用，业务层不再自己扩展 controlId。
   */
  public resolveControlBoundaryElements(options: {
    range?: IRange
    elementList?: IElement[]
  } = {}): IDrawResolvedControlBoundaryElements | null {
    return this.contextResolver.resolveControlBoundaryElements(options)
  }

  /**
   * 按当前选区边界和偏移量解析目标元素。
   *
   * 这个入口专门给“当前对象/相邻对象”场景用，避免业务侧自己拼索引。
   */
  public resolveRangeElement(options: {
    range?: IRange
    elementList?: IElement[]
    anchor?: 'start' | 'end'
    offset?: number
  } = {}): IElement | null {
    return this.contextResolver.resolveRangeElement(options)
  }

  public resolveTableIndexById(tableId: string): number {
    return this.contextResolver.resolveTableIndexById(tableId)
  }

  public resolveOriginalTableById(
    tableId: string
  ): { index: number; element: IElement } | null {
    return this.contextResolver.resolveOriginalTableById(tableId)
  }

  public resolveLogicalTableById(
    tableId: string | null | undefined,
    options: { normalize?: boolean } = {}
  ): { index: number; element: IElement } | null {
    return this.contextResolver.resolveLogicalTableById(tableId, options)
  }

  public resolveOriginalTableByIndex(
    index: number,
    options: { normalize?: boolean } = {}
  ): { index: number; element: IElement } | null {
    return this.contextResolver.resolveOriginalTableByIndex(index, options)
  }

  public resolveContextTable(options: {
    tableId?: string
    range?: IRange
    positionContext?: IPositionContext
    normalize?: boolean
  } = {}): IDrawResolvedTableContext | null {
    return this.contextResolver.resolveContextTable(options)
  }

  public resolveTableTarget(options: {
    hitTableInfo?: ITableInfoByEvent | null
    positionContext?: IPositionContext
  } = {}): IDrawResolvedTableTarget | null {
    return this.contextResolver.resolveTableTarget(options)
  }

  public resolveElementByPositionContext(
    positionContext: IPositionContext | ICurrentPosition
  ): { element: IElement | null; tableCell: IDrawResolvedTableTd | null } {
    return this.contextResolver.resolveElementByPositionContext(positionContext)
  }

  public resolveActiveLogicalTableCell(options: {
    range?: IRange
    positionContext?: IPositionContext | ICurrentPosition
  } = {}): IDrawResolvedTableCell | null {
    return this.contextResolver.resolveActiveLogicalTableCell(options)
  }

  public resolveLogicalTableCellByPositionContext(
    positionContext: IPositionContext | ICurrentPosition
  ): IDrawResolvedTableCell | null {
    return this.contextResolver.resolveLogicalTableCellByPositionContext(
      positionContext
    )
  }

  public resolveActiveLogicalTableTd(options: {
    range?: IRange
    positionContext?: IPositionContext | ICurrentPosition
  } = {}): IDrawResolvedTableTd | null {
    return this.contextResolver.resolveActiveLogicalTableTd(options)
  }

  public resolveOriginalTableTdByIndex(payload: {
    tableIndex: number
    trIndex: number
    tdIndex: number
  }): IDrawResolvedTableTd | null {
    return this.contextResolver.resolveOriginalTableTdByIndex(payload)
  }

  public resolveTableTdByIndex(payload: {
    elementList: IElement[]
    tableIndex: number
    trIndex: number
    tdIndex: number
  }): IDrawResolvedTableTd | null {
    return this.contextResolver.resolveTableTdByIndex(payload)
  }

  public resolvePreviousPagingTable(
    positionContext: IPositionContext
  ): IDrawResolvedPreviousPagingTable | null {
    return this.contextResolver.resolvePreviousPagingTable(positionContext)
  }

  public getLogicalCellSliceList(
    tableIndex: number,
    trIndex: number,
    tdIndex: number
  ): ITableLayoutCellSlice[] {
    return this.contextResolver.getLogicalCellSliceList(
      tableIndex,
      trIndex,
      tdIndex
    )
  }

  public getTableSnapshotStats() {
    return this.snapshotResolver.getStats()
  }

  public resolveTableSliceByPositionContext(
    positionContext: IPositionContext | ICurrentPosition | null | undefined
  ): ITableLayoutCellSlice | null {
    return this.snapshotResolver.resolveTableSliceByPositionContext(
      positionContext
    )
  }

  public resolveTableSliceByFragmentContext(
    context: ITableSnapshotCellContext | null | undefined
  ): ITableLayoutCellSlice | null {
    return this.snapshotResolver.resolveTableSliceByFragmentContext(context)
  }

  public getPageFragmentPositions(pageNo: number) {
    return this.snapshotResolver.getPageFragmentPositions(pageNo)
  }

  public getFragmentCellBounds(fragmentTableId: string) {
    return this.snapshotResolver.getFragmentCellBounds(fragmentTableId)
  }

  public isSameLogicalTable(
    tableId: string | null | undefined,
    otherTableId: string | null | undefined
  ): boolean {
    return this.snapshotResolver.isSameLogicalTable(tableId, otherTableId)
  }

  public getCellSlicesByLogicalCell(payload: {
    tableId: string
    trId: string
    tdId: string
  }): ITableLayoutCellSlice[] {
    return this.snapshotResolver.getCellSlicesByLogicalCell(payload)
  }

  public getCellSlicesByCellKey(
    cellKey: TLogicalTableCellKey | null | undefined
  ): ITableLayoutCellSlice[] {
    return this.snapshotResolver.getCellSlicesByCellKey(cellKey)
  }

  public resolveCellSliceByAbsoluteIndex(payload: {
    tableId: string
    trId: string
    tdId: string
    absoluteIndex: number
  }): ITableLayoutCellSlice | null {
    return this.snapshotResolver.resolveCellSliceByAbsoluteIndex(payload)
  }

  public resolveCellSliceByPageNo(payload: {
    tableId: string
    trId: string
    tdId: string
    pageNo: number
  }): ITableLayoutCellSlice | null {
    return this.snapshotResolver.resolveCellSliceByPageNo(payload)
  }

  public resolveCellLocalRange(
    context: ITableSnapshotCellContext | null | undefined,
    startIndex: number,
    endIndex: number
  ): ITableSnapshotCellLocalRange | null {
    return this.snapshotResolver.resolveCellLocalRange(
      context,
      startIndex,
      endIndex
    )
  }

  public getSelectionRangeForElementList(
    elementList: IElement[],
    startIndex: number,
    endIndex: number,
    activeCellKey?: string | null
  ): ITableSnapshotCellLocalRange | null {
    return this.snapshotResolver.getSelectionRangeForElementList(
      elementList,
      startIndex,
      endIndex,
      activeCellKey
    )
  }
}
