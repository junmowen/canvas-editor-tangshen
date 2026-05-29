import { IElement } from '../../../../interface/Element'
import { ICurrentPosition, IPositionContext } from '../../../../interface/Position'
import {
  ITableSnapshotCellContext,
  ITableSnapshotCellLocalRange
} from '../layout/TableLayoutSnapshotAccessor'
import {
  ITableLayoutCellSlice,
  TLogicalTableCellKey
} from '../layout/TableLayoutSnapshotTypes'
import type { Draw } from '../../../draw/Draw'

export class DrawTableTargetSnapshotResolver {
  /** 初始化 DrawTableTargetSnapshotResolver 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 读取 table Snapshot Accessor 属性值。 */
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
    /** 表格标识，用于关联表格片段、行和单元格。 */
    tableId: string
    /** 表格行标识，用于关联行位置、片段和选区。 */
    trId: string
    /** 单元格标识，用于关联单元格位置、片段和选区。 */
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
    /** 表格标识，用于关联表格片段、行和单元格。 */
    tableId: string
    /** 表格行标识，用于关联行位置、片段和选区。 */
    trId: string
    /** 单元格标识，用于关联单元格位置、片段和选区。 */
    tdId: string
    /** 文档级元素索引，用于跨片段定位原始元素。 */
    absoluteIndex: number
  }): ITableLayoutCellSlice | null {
    return this.tableSnapshotAccessor.resolveCellSliceByAbsoluteIndex(payload)
  }

  public resolveCellSliceByPageNo(payload: {
    /** 表格标识，用于关联表格片段、行和单元格。 */
    tableId: string
    /** 表格行标识，用于关联行位置、片段和选区。 */
    trId: string
    /** 单元格标识，用于关联单元格位置、片段和选区。 */
    tdId: string
    /** 页码，用于定位分页结果中的目标页面。 */
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
