import { IElement, IElementPosition } from '../../../interface/Element'
import { IPositionContext } from '../../../interface/Position'
import { resolveSelectionContentRange } from '../../range/utils/resolveSelectionContent'
import { Draw } from '../../draw/Draw'
import {
  getTableLayoutCellFragmentAliasKey,
  getTableLayoutCellPageKey,
  getTableLayoutFragmentCellKey,
  getTableLayoutLogicalCellKey,
  ITableLayoutCellSlice,
  TLogicalTableCellKey
} from './TableLayoutSnapshotTypes'

// 统一的 cell 查询上下文。
// 允许调用方传逻辑坐标，也允许传 fragment 坐标。
export interface ITableSnapshotCellContext {
  tableId: string
  trId: string
  tdId: string
  trIndex?: number
  tdIndex?: number
}

export interface ITableSnapshotCellLocalRange {
  startIndex: number
  endIndex: number
  absoluteStart: number
  absoluteEnd: number
}

/**
 * 快照访问器。
 *
 * 职责：
 * 1. 把快照上的多组索引查询封装成稳定 API；
 * 2. 让命中、导航、命令、渲染都不再直接操作底层 Map 细节。
 */
export class TableLayoutSnapshotAccessor {
  private readonly draw: Draw

  constructor(draw: Draw) {
    this.draw = draw
  }

  public resolveSliceByFragmentContext(
    context: ITableSnapshotCellContext | null | undefined
  ): ITableLayoutCellSlice | null {
    // 优先按 fragment 坐标精确命中；
    // 命不中再回退到逻辑 alias 索引。
    if (!context?.tableId || !context.trId || !context.tdId) {
      return null
    }

    const snapshot = this.draw.getTableLayoutSnapshot()
    const directSlice = snapshot.slicesByFragmentCellKey.get(
      getTableLayoutFragmentCellKey(
        context.tableId,
        context.trId,
        context.tdId
      )
    )
    if (directSlice) {
      return directSlice
    }

    return (
      snapshot.slicesByLogicalFragmentCellKey.get(
        getTableLayoutFragmentCellKey(
          context.tableId,
          context.trId,
          context.tdId
        )
      ) || null
    )
  }

  public resolveSliceByPositionContext(
    positionContext: IPositionContext | null | undefined
  ): ITableLayoutCellSlice | null {
    // 事件层 / 命令层经常持有的是 positionContext，
    // 这里统一把它桥接回快照 slice。
    if (!positionContext?.isTable) {
      return null
    }

    const directSlice = this.resolveSliceByFragmentContext({
      tableId: positionContext.tableId!,
      trId: positionContext.trId!,
      tdId: positionContext.tdId!,
      trIndex: positionContext.trIndex,
      tdIndex: positionContext.tdIndex
    })
    if (directSlice) {
      return directSlice
    }

    if (
      positionContext.index === undefined ||
      positionContext.trIndex === undefined ||
      positionContext.tdIndex === undefined
    ) {
      return null
    }

    const table = this.draw.getOriginalElementList()[positionContext.index]
    const tr = table?.trList?.[positionContext.trIndex]
    const td = tr?.tdList?.[positionContext.tdIndex]
    if (!table?.id || !tr?.id || !td?.id) {
      return null
    }

    const cellSliceList = this.getCellSlicesByLogicalCell({
      tableId: table.id,
      trId: tr.id,
      tdId: td.id
    })
    if (positionContext.trId && positionContext.tdId) {
      const aliasSlice =
        this.draw
          .getTableLayoutSnapshot()
          .slicesByCellFragmentAliasKey.get(
            getTableLayoutCellFragmentAliasKey(
              getTableLayoutLogicalCellKey(table.id, tr.id, td.id),
              positionContext.trId,
              positionContext.tdId
            )
          ) || null
      if (aliasSlice) {
        return aliasSlice
      }
    }

    return cellSliceList[0] || null
  }

  public getCellSlicesByCellKey(
    cellKey: TLogicalTableCellKey | null | undefined
  ): ITableLayoutCellSlice[] {
    if (!cellKey) {
      return []
    }
    return this.draw.getTableLayoutSnapshot().slicesByCellKey.get(cellKey) || []
  }

  public getCellSlicesByLogicalCell(payload: {
    tableId: string
    trId: string
    tdId: string
  }): ITableLayoutCellSlice[] {
    return this.getCellSlicesByCellKey(
      getTableLayoutLogicalCellKey(payload.tableId, payload.trId, payload.tdId)
    )
  }

  public resolveCellSliceByAbsoluteIndex(payload: {
    tableId: string
    trId: string
    tdId: string
    absoluteIndex: number
  }): ITableLayoutCellSlice | null {
    const cellKey = getTableLayoutLogicalCellKey(
      payload.tableId,
      payload.trId,
      payload.tdId
    )
    const snapshot = this.draw.getTableLayoutSnapshot()
    const cellSliceList = snapshot.slicesByCellKey.get(cellKey) || []
    const sliceStartIndexes = snapshot.sliceStartIndexesByCellKey.get(cellKey) || []
    if (!cellSliceList.length || !sliceStartIndexes.length) {
      return null
    }

    let left = 0
    let right = sliceStartIndexes.length - 1
    let candidateIndex = -1
    while (left <= right) {
      const middle = Math.floor((left + right) / 2)
      if (sliceStartIndexes[middle] <= payload.absoluteIndex) {
        candidateIndex = middle
        left = middle + 1
      } else {
        right = middle - 1
      }
    }

    if (candidateIndex < 0) {
      return null
    }

    const candidateSlice = cellSliceList[candidateIndex]
    if (
      payload.absoluteIndex >= candidateSlice.absoluteStart &&
      payload.absoluteIndex < candidateSlice.absoluteEnd
    ) {
      return candidateSlice
    }

    return null
  }

  public resolveCellSliceByPageNo(payload: {
    tableId: string
    trId: string
    tdId: string
    pageNo: number
  }): ITableLayoutCellSlice | null {
    return (
      this.draw
        .getTableLayoutSnapshot()
        .slicesByCellPageKey.get(
          getTableLayoutCellPageKey(
            getTableLayoutLogicalCellKey(
              payload.tableId,
              payload.trId,
              payload.tdId
            ),
            payload.pageNo
          )
        ) || null
    )
  }

  public getPageFragmentPositions(pageNo: number): IElementPosition[] {
    const pagePositions =
      this.draw.getTableLayoutSnapshot().fragmentPositionsByPageNo.get(pageNo) || []
    return pagePositions
  }

  public getFragmentCellBounds(fragmentTableId: string) {
    return (
      this.draw.getTableLayoutSnapshot().cellBoundsByFragmentTableId.get(
        fragmentTableId
      ) || []
    )
  }

  public resolveCellLocalRange(
    context: ITableSnapshotCellContext | null | undefined,
    startIndex: number,
    endIndex: number
  ): ITableSnapshotCellLocalRange | null {
    const activeSlice = this.resolveSliceByFragmentContext(context)
    if (!activeSlice) {
      return null
    }

    const cellSliceList = this.getCellSlicesByCellKey(activeSlice.cellKey)
    if (cellSliceList.length <= 1) {
      return null
    }

    const selectionContentRange = resolveSelectionContentRange(startIndex, endIndex)
    if (!selectionContentRange) {
      return null
    }

    const selectionStart = Math.max(
      activeSlice.absoluteStart,
      selectionContentRange.startIndex
    )
    const selectionEnd = Math.min(
      activeSlice.absoluteEnd - 1,
      selectionContentRange.endIndex
    )
    if (selectionStart > selectionEnd) {
      return null
    }

    return {
      startIndex: selectionStart - activeSlice.absoluteStart,
      endIndex: selectionEnd - activeSlice.absoluteStart,
      absoluteStart: activeSlice.absoluteStart,
      absoluteEnd: activeSlice.absoluteEnd
    }
  }

  public getSelectionRangeForElementList(
    elementList: IElement[],
    startIndex: number,
    endIndex: number,
    activeCellKey?: string | null
  ): ITableSnapshotCellLocalRange | null {
    let anchorElement: IElement | null = null
    for (let i = 0; i < elementList.length; i++) {
      const element = elementList[i]
      if (element.tableId && element.trId && element.tdId) {
        anchorElement = element
        break
      }
    }
    if (
      !anchorElement?.tableId ||
      !anchorElement.trId ||
      !anchorElement.tdId
    ) {
      return null
    }

    const activeSlice = this.resolveSliceByFragmentContext({
      tableId: anchorElement.tableId,
      trId: anchorElement.trId,
      tdId: anchorElement.tdId
    })
    if (!activeSlice) {
      return null
    }
    if (activeCellKey && activeSlice.cellKey !== activeCellKey) {
      return null
    }

    return this.resolveCellLocalRange(
      {
        tableId: anchorElement.tableId,
        trId: anchorElement.trId,
        tdId: anchorElement.tdId
      },
      startIndex,
      endIndex
    )
  }

  public resolveLogicalTableId(tableId: string | null | undefined): string | null {
    if (!tableId) {
      return null
    }

    if (
      this.draw.getTableLayoutSnapshot().logicalTableIndexByTableId.has(tableId)
    ) {
      return tableId
    }

    return (
      this.draw
        .getTableLayoutSnapshot()
        .logicalTableIdByFragmentTableId.get(tableId) || null
    )
  }

  public resolveLogicalTableIndex(tableId: string | null | undefined): number | null {
    const logicalTableId = this.resolveLogicalTableId(tableId)
    if (!logicalTableId) {
      return null
    }
    return (
      this.draw
        .getTableLayoutSnapshot()
        .logicalTableIndexByTableId.get(logicalTableId) ?? null
    )
  }

  public isSameLogicalTable(
    tableId: string | null | undefined,
    otherTableId: string | null | undefined
  ): boolean {
    const currentLogicalTableId = this.resolveLogicalTableId(tableId)
    const otherLogicalTableId = this.resolveLogicalTableId(otherTableId)
    return !!(
      currentLogicalTableId &&
      otherLogicalTableId &&
      currentLogicalTableId === otherLogicalTableId
    )
  }
}
