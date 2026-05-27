import { IElement } from '../../../interface/Element'
import { ICurrentPosition, IPositionContext } from '../../../interface/Position'
import {
  ITableSnapshotCellContext,
  ITableSnapshotCellLocalRange
} from '../../table/layout/TableLayoutSnapshotAccessor'
import {
  ITableLayoutCellSlice,
  TLogicalTableCellKey
} from '../../table/layout/TableLayoutSnapshotTypes'
import type { Draw } from '../Draw'

export class DrawTableTargetSnapshotResolver {
  constructor(private readonly draw: Draw) {}

  private get tableSnapshotAccessor() {
    return this.draw.getServices().tableLayoutSnapshotAccessor
  }

  public getStats() {
    return this.tableSnapshotAccessor.getStats()
  }

  public resolveLogicalTableIndex(tableId: string | null | undefined) {
    return this.tableSnapshotAccessor.resolveLogicalTableIndex(tableId)
  }

  public resolveTableSliceByPositionContext(
    positionContext: IPositionContext | ICurrentPosition | null | undefined
  ) {
    return this.tableSnapshotAccessor.resolveSliceByPositionContext(
      positionContext
    )
  }

  public resolveTableSliceByFragmentContext(
    context: ITableSnapshotCellContext | null | undefined
  ): ITableLayoutCellSlice | null {
    return this.tableSnapshotAccessor.resolveSliceByFragmentContext(context)
  }

  public getPageFragmentPositions(pageNo: number) {
    return this.tableSnapshotAccessor.getPageFragmentPositions(pageNo)
  }

  public getFragmentCellBounds(fragmentTableId: string) {
    return this.tableSnapshotAccessor.getFragmentCellBounds(fragmentTableId)
  }

  public isSameLogicalTable(
    tableId: string | null | undefined,
    otherTableId: string | null | undefined
  ): boolean {
    return this.tableSnapshotAccessor.isSameLogicalTable(tableId, otherTableId)
  }

  public getCellSlicesByLogicalCell(payload: {
    tableId: string
    trId: string
    tdId: string
  }): ITableLayoutCellSlice[] {
    return this.tableSnapshotAccessor
      .getCellSlicesByLogicalCell(payload)
      .slice()
  }

  public getCellSlicesByCellKey(
    cellKey: TLogicalTableCellKey | null | undefined
  ): ITableLayoutCellSlice[] {
    return this.tableSnapshotAccessor
      .getCellSlicesByCellKey(cellKey)
      .slice()
  }

  public resolveCellSliceByAbsoluteIndex(payload: {
    tableId: string
    trId: string
    tdId: string
    absoluteIndex: number
  }): ITableLayoutCellSlice | null {
    return this.tableSnapshotAccessor.resolveCellSliceByAbsoluteIndex(payload)
  }

  public resolveCellSliceByPageNo(payload: {
    tableId: string
    trId: string
    tdId: string
    pageNo: number
  }): ITableLayoutCellSlice | null {
    return this.tableSnapshotAccessor.resolveCellSliceByPageNo(payload)
  }

  public resolveCellLocalRange(
    context: ITableSnapshotCellContext | null | undefined,
    startIndex: number,
    endIndex: number
  ): ITableSnapshotCellLocalRange | null {
    return this.tableSnapshotAccessor.resolveCellLocalRange(
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
    return this.tableSnapshotAccessor.getSelectionRangeForElementList(
      elementList,
      startIndex,
      endIndex,
      activeCellKey
    )
  }
}
