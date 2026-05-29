import { ITableInfoByEvent } from '../../../interface/Event'
import { IElement } from '../../../interface/Element'
import { ICurrentPosition, IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import {
  ITableSnapshotCellContext,
  ITableSnapshotCellLocalRange
} from '../../modules/table/layout/TableLayoutSnapshotAccessor'
import {
  ITableLayoutCellSlice,
  TLogicalTableCellKey
} from '../../modules/table/layout/TableLayoutSnapshotTypes'
import type { Draw } from '../Draw'
import { DrawTableTargetContextResolver } from '../../modules/table/target/DrawTableTargetContextResolver'
import { DrawTableTargetSnapshotResolver } from '../../modules/table/target/DrawTableTargetSnapshotResolver'
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
  /** 只读上下文resolver依赖，负责把输入数据解析为目标上下文。 */
  private readonly contextResolver: DrawTableTargetContextResolver
  /** 只读snapshotresolver依赖，负责把输入数据解析为目标上下文。 */
  private readonly snapshotResolver: DrawTableTargetSnapshotResolver

  /** 初始化 DrawTargetResolverService 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.snapshotResolver = new DrawTableTargetSnapshotResolver(draw)
    this.contextResolver = new DrawTableTargetContextResolver(
      draw,
      this.snapshotResolver
    )
  }

  public resolveRangeBoundaryElements(options: {
    /** 选区范围，记录起止索引和方向信息。 */
    range?: IRange
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList?: IElement[]
  } = {}): IDrawResolvedRangeBoundaryElements {
    return this.contextResolver.resolveRangeBoundaryElements(options)
  }

  public resolveRangeContextBoundaryElements(payload: {
    /** 选区是否折叠，用于区分光标和范围选择。 */
    isCollapsed: boolean
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 结束元素索引，用于确定处理范围的右边界。 */
    endIndex: number
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    selectedElementList: IElement[]
  }): IDrawResolvedRangeContextBoundaryElements | null {
    return this.contextResolver.resolveRangeContextBoundaryElements(payload)
  }

  public resolveRangeAnchorElement(options: {
    /** 选区范围，记录起止索引和方向信息。 */
    range?: IRange
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
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
    /** 选区范围，记录起止索引和方向信息。 */
    range?: IRange
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
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
    /** 选区范围，记录起止索引和方向信息。 */
    range?: IRange
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList?: IElement[]
    /** 锚点位置，用于记录选区或拖拽的固定端。 */
    anchor?: 'start' | 'end'
    /** 偏移量，用于把局部坐标或索引换算到目标空间。 */
    offset?: number
  } = {}): IElement | null {
    return this.contextResolver.resolveRangeElement(options)
  }

  public resolveTableIndexById(tableId: string): number {
    return this.contextResolver.resolveTableIndexById(tableId)
  }

  public resolveOriginalTableById(
    tableId: string
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  /** 元素索引，用于定位文档列表中的目标元素。 */
  ): { index: number; element: IElement } | null {
    return this.contextResolver.resolveOriginalTableById(tableId)
  }

  public resolveLogicalTableById(
    tableId: string | null | undefined,
    /** 是否归一化，用于控制输出前是否整理数据结构。 */
    options: { normalize?: boolean } = {}
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  /** 元素索引，用于定位文档列表中的目标元素。 */
  ): { index: number; element: IElement } | null {
    return this.contextResolver.resolveLogicalTableById(tableId, options)
  }

  public resolveOriginalTableByIndex(
    index: number,
    /** 是否归一化，用于控制输出前是否整理数据结构。 */
    options: { normalize?: boolean } = {}
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  /** 元素索引，用于定位文档列表中的目标元素。 */
  ): { index: number; element: IElement } | null {
    return this.contextResolver.resolveOriginalTableByIndex(index, options)
  }

  public resolveContextTable(options: {
    /** 表格标识，用于关联表格片段、行和单元格。 */
    tableId?: string
    /** 选区范围，记录起止索引和方向信息。 */
    range?: IRange
    /** 命中位置上下文，连接元素索引、行列和区域信息。 */
    positionContext?: IPositionContext
    /** 是否归一化，用于控制输出前是否整理数据结构。 */
    normalize?: boolean
  } = {}): IDrawResolvedTableContext | null {
    return this.contextResolver.resolveContextTable(options)
  }

  public resolveTableTarget(options: {
    hitTableInfo?: ITableInfoByEvent | null
    /** 命中位置上下文，连接元素索引、行列和区域信息。 */
    positionContext?: IPositionContext
  } = {}): IDrawResolvedTableTarget | null {
    return this.contextResolver.resolveTableTarget(options)
  }

  public resolveElementByPositionContext(
    positionContext: IPositionContext | ICurrentPosition
  /** 表格单元格，用于保存或定位表格单元格结构。 */
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  ): { element: IElement | null; tableCell: IDrawResolvedTableTd | null } {
    return this.contextResolver.resolveElementByPositionContext(positionContext)
  }

  public resolveActiveLogicalTableCell(options: {
    /** 选区范围，记录起止索引和方向信息。 */
    range?: IRange
    /** 命中位置上下文，连接元素索引、行列和区域信息。 */
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
    /** 选区范围，记录起止索引和方向信息。 */
    range?: IRange
    /** 命中位置上下文，连接元素索引、行列和区域信息。 */
    positionContext?: IPositionContext | ICurrentPosition
  } = {}): IDrawResolvedTableTd | null {
    return this.contextResolver.resolveActiveLogicalTableTd(options)
  }

  public resolveOriginalTableTdByIndex(payload: {
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 表格行索引，用于定位当前表格内的目标行。 */
    trIndex: number
    /** 单元格索引，用于定位当前行内的目标单元格。 */
    tdIndex: number
  }): IDrawResolvedTableTd | null {
    return this.contextResolver.resolveOriginalTableTdByIndex(payload)
  }

  public resolveTableTdByIndex(payload: {
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 表格行索引，用于定位当前表格内的目标行。 */
    trIndex: number
    /** 单元格索引，用于定位当前行内的目标单元格。 */
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
    /** 表格标识，用于关联表格片段、行和单元格。 */
    tableId: string
    /** 表格行标识，用于关联行位置、片段和选区。 */
    trId: string
    /** 单元格标识，用于关联单元格位置、片段和选区。 */
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
    /** 表格标识，用于关联表格片段、行和单元格。 */
    tableId: string
    /** 表格行标识，用于关联行位置、片段和选区。 */
    trId: string
    /** 单元格标识，用于关联单元格位置、片段和选区。 */
    tdId: string
    /** 文档级元素索引，用于跨片段定位原始元素。 */
    absoluteIndex: number
  }): ITableLayoutCellSlice | null {
    return this.snapshotResolver.resolveCellSliceByAbsoluteIndex(payload)
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
