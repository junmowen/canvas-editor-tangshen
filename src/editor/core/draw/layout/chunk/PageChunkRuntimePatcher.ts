import { ElementType } from '../../../../dataset/enum/Element'
import { IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import type { Draw } from '../../Draw'
import { getRowsHeight, patchArraySegment, shiftRowsAfterPatch } from './ChunkPatchAlgorithms'
import { isChunkDebugEnabled, logChunkDebug } from './ChunkDebugLogger'
import { IChunkLayoutPatchContext } from './ChunkLayoutTypes'
import { IPageChunkRebalanceResult } from './PageChunkRebalanceTypes'

/** 页级 rebalance 的运行时状态写回器。 */
export class PageChunkRuntimePatcher {
  constructor(private readonly draw: Draw) {}

  /** 写回页窗口结果，并同步窗口之后的索引、页码和行号。 */
  public patch(
    context: IChunkLayoutPatchContext,
    rebalanceResult: IPageChunkRebalanceResult
  ) {
    const runtimeRowList = this.draw.getRuntime().getRuntimeRowList()
    const pageRowList = this.draw.getPageRowList()
    const oldWindowPageRows = this.getOldWindowPageRows(
      context.pageNo,
      rebalanceResult.oldPageCount
    )
    const shouldSyncTableDescendants =
      rebalanceResult.requiresSurfaceClear ||
      this.hasTableRows(oldWindowPageRows) ||
      this.hasTableRows(rebalanceResult.pageRowList)
    const firstOldRow = oldWindowPageRows[0]?.[0]
    const rowStart = firstOldRow ? runtimeRowList.indexOf(firstOldRow) : -1
    const indexDelta =
      rebalanceResult.elementList.length - rebalanceResult.oldElementCount
    const rowDelta = rebalanceResult.nextRowCount - rebalanceResult.oldRowCount
    const pageDelta =
      rebalanceResult.nextPageCount - rebalanceResult.measuredWindowPageCount
    const layoutStartOffset = this.countLayoutElementsBeforePage(context.pageNo)
    const oldLayoutElementCount = this.countPageRowElements(oldWindowPageRows)

    if (rowStart >= 0) {
      patchArraySegment({
        list: runtimeRowList,
        startIndex: rowStart,
        deleteCount: rebalanceResult.oldRowCount,
        itemList: rebalanceResult.pageRowList.flat()
      })
      shiftRowsAfterPatch({
        rowList: runtimeRowList,
        startOffset: rowStart + rebalanceResult.nextRowCount,
        indexDelta,
        rowDelta
      })
    }
    pageRowList.splice(
      context.pageNo,
      rebalanceResult.measuredWindowPageCount,
      ...rebalanceResult.pageRowList
    )
    const layoutElementList = this.patchLayoutStateWindow({
      positionList: rebalanceResult.positionList,
      layoutStartOffset,
      oldLayoutElementCount,
      indexDelta,
      rowDelta,
      pageDelta,
      oldWindowEndPageNo: rebalanceResult.oldWindowEndPageNo,
      pageRowList: rebalanceResult.pageRowList
    })
    if (isChunkDebugEnabled()) {
      logChunkDebug('page-rebalance:patch-runtime', {
        pageNo: context.pageNo,
        shouldSyncTableDescendants,
        rowStart,
        indexDelta,
        rowDelta,
        pageDelta,
        oldLayoutElementCount,
        layoutStartOffset,
        measuredWindowPageCount: rebalanceResult.measuredWindowPageCount,
        oldPageCount: rebalanceResult.oldPageCount,
        nextPageCount: rebalanceResult.nextPageCount,
        affectedPageNoList: rebalanceResult.affectedPageNoList,
        requiresSurfaceClear: rebalanceResult.requiresSurfaceClear,
        nextRuntimeRowCount: runtimeRowList.length,
        nextLayoutElementCount: layoutElementList.length,
        pageCount: pageRowList.length
      })
    }
    this.draw.replaceLayoutState({
      rowList: runtimeRowList,
      pageRowList,
      layoutElementList,
      tableLayoutSnapshotVersion: this.resolveNextTableSnapshotVersion(
        shouldSyncTableDescendants
      ),
      tableLayoutSnapshot: null
    })
    this.rebuildDescendantTableChunksIfNeeded(shouldSyncTableDescendants)
    this.draw.getServices().documentChunkIndex.rebuildPageChunks()
    this.rebuildTableRangeIndexIfNeeded(shouldSyncTableDescendants)
    this.extendAffectedPagesWithNextTableRange({
      context,
      rebalanceResult,
      shouldSyncTableDescendants
    })
    if (!shouldSyncTableDescendants) {
      this.cacheWindowPages({
        context,
        pageRowList: rebalanceResult.pageRowList,
        positionList: rebalanceResult.positionList
      })
    }
    this.draw
      .getServices()
      .documentChunkIndex.markDirtyAroundIndex(rebalanceResult.startIndex, 0)
  }

  /** 获取旧窗口内的页行数据。 */
  public getOldWindowPageRows(
    startPageNo: number,
    pageCount: number
  ): IRow[][] {
    const pageRowList = this.draw.getPageRowList()
    const windowPageRows: IRow[][] = []
    for (let i = 0; i < pageCount; i++) {
      const pageRows = pageRowList[startPageNo + i]
      if (pageRows?.length) {
        windowPageRows.push(pageRows)
      }
    }
    return windowPageRows
  }

  /** 判断页窗口是否包含表格行或表格 fragment。 */
  public hasTableRows(pageRowList: IRow[][]) {
    return pageRowList.some(pageRows =>
      pageRows.some(row =>
        Boolean(row.tableFragment) ||
        row.elementList.some(element => element.type === ElementType.TABLE)
      )
    )
  }

  /** 局部替换 position / layoutElementList，避免表格迁移退化为整篇派生状态重建。 */
  private patchLayoutStateWindow(payload: {
    positionList: IElementPosition[]
    layoutStartOffset: number
    oldLayoutElementCount: number
    indexDelta: number
    rowDelta: number
    pageDelta: number
    oldWindowEndPageNo: number
    pageRowList: IRow[][]
  }) {
    this.patchPositionList({
      positionList: payload.positionList,
      startOffset: payload.layoutStartOffset,
      deleteCount: payload.oldLayoutElementCount,
      indexDelta: payload.indexDelta,
      rowDelta: payload.rowDelta,
      pageDelta: payload.pageDelta,
      oldWindowEndPageNo: payload.oldWindowEndPageNo
    })
    const layoutElementList = this.draw.getObjectResolver().getLayoutMainElementList()
    patchArraySegment({
      list: layoutElementList,
      startIndex: payload.layoutStartOffset,
      deleteCount: payload.oldLayoutElementCount,
      itemList: payload.pageRowList.flatMap(pageRows =>
        pageRows.flatMap(row => row.elementList)
      )
    })
    return layoutElementList
  }

  /** 页 chunk 移动表格时，表格 / td 子孙 chunk 必须和父页窗口使用同一份布局结果。 */
  private rebuildDescendantTableChunksIfNeeded(shouldSync: boolean) {
    if (!shouldSync) {
      return
    }
    const nextSnapshot = this.draw.getServices().tableLayoutSnapshotBuilder.build({
      version: this.draw.getTableLayoutSnapshotVersion()
    })
    this.draw.replaceTableLayoutSnapshot(nextSnapshot)
    this.draw
      .getServices()
      .tableCellChunkIndex.rebuild('page-chunk-table-descendant-sync')
  }

  /** 页 chunk 影响表格父范围时，同步刷新只读范围索引，供下一次输入继续按父子窗口推进。 */
  private rebuildTableRangeIndexIfNeeded(shouldSync: boolean) {
    if (!shouldSync) {
      return
    }
    this.draw
      .getServices()
      .tableChunkRangeIndex.rebuild('page-chunk-table-descendant-sync')
  }

  /** 表格移动后把新表格父范围也并入受影响页，确保旧页和新页都会强制清理重绘。 */
  private extendAffectedPagesWithNextTableRange(payload: {
    context: IChunkLayoutPatchContext
    rebalanceResult: IPageChunkRebalanceResult
    shouldSyncTableDescendants: boolean
  }) {
    if (!payload.shouldSyncTableDescendants) {
      return
    }
    const nextTableAffectedPageNoList = this.draw
      .getServices()
      .tableChunkRangeIndex.getAffectedPageNoListForWindow(
        payload.context.pageNo,
        payload.rebalanceResult.nextPageCount
      )
    const pageNoSet = new Set(payload.rebalanceResult.affectedPageNoList)
    for (
      let pageNo = payload.context.pageNo;
      pageNo <= payload.rebalanceResult.oldWindowEndPageNo;
      pageNo++
    ) {
      pageNoSet.add(pageNo)
    }
    for (
      let pageOffset = 0;
      pageOffset < payload.rebalanceResult.nextPageCount;
      pageOffset++
    ) {
      pageNoSet.add(payload.context.pageNo + pageOffset)
    }
    nextTableAffectedPageNoList.forEach(pageNo => pageNoSet.add(pageNo))
    payload.rebalanceResult.affectedPageNoList = Array.from(pageNoSet).sort(
      (a, b) => a - b
    )
  }

  /** 表格 fragment 出现在页窗口内时，推进表格快照版本。 */
  private resolveNextTableSnapshotVersion(shouldSyncTableDescendants: boolean) {
    return shouldSyncTableDescendants
      ? this.draw.getTableLayoutSnapshotVersion() + 1
      : this.draw.getTableLayoutSnapshotVersion()
  }

  /** 缓存每个页级 chunk 的行和位置结果，后续同页输入可以直接复用。 */
  private cacheWindowPages(payload: {
    context: IChunkLayoutPatchContext
    pageRowList: IRow[][]
    positionList: IElementPosition[]
  }) {
    const documentChunkIndex = this.draw.getServices().documentChunkIndex
    for (
      let pageOffset = 0;
      pageOffset < payload.pageRowList.length;
      pageOffset++
    ) {
      const pageRows = payload.pageRowList[pageOffset]
      const pageNo = payload.context.pageNo + pageOffset
      const chunk = documentChunkIndex.getPageChunkByPageNo(pageNo)
      if (!pageRows.length || !chunk) {
        continue
      }
      const startIndex = pageRows[0].startIndex
      const lastRow = pageRows[pageRows.length - 1]
      const endIndex =
        lastRow.startIndex + Math.max(0, lastRow.elementList.length - 1)
      this.draw.getServices().chunkLayoutCache.set({
        chunk,
        startIndex,
        endIndex,
        pageNo,
        startX: payload.context.startX,
        startY: payload.context.startY,
        innerWidth: payload.context.innerWidth,
        rowList: pageRows,
        positionList: payload.positionList.filter(
          position => position.pageNo === pageNo
        ),
        height: getRowsHeight(pageRows)
      })
    }
  }

  /** 统计指定页之前的布局元素数量，分页表格 fragment 不能用原始元素 index 当扁平偏移。 */
  private countLayoutElementsBeforePage(pageNo: number) {
    const pageRowList = this.draw.getPageRowList()
    let count = 0
    for (let index = 0; index < pageNo; index++) {
      count += this.countPageRowElements([pageRowList[index] || []])
    }
    return count
  }

  /** 统计页行窗口中的扁平布局元素数量，表格 fragment 每页都有独立锚点。 */
  private countPageRowElements(pageRowList: IRow[][]) {
    return pageRowList.reduce((count, pageRows) => {
      return (
        count +
        pageRows.reduce(
          (pageCount, row) => pageCount + row.elementList.length,
          0
        )
      )
    }, 0)
  }

  /** 替换窗口位置，并平移窗口之后的位置页码、行号和索引。 */
  private patchPositionList(payload: {
    positionList: IElementPosition[]
    startOffset: number
    deleteCount: number
    indexDelta: number
    rowDelta: number
    pageDelta: number
    oldWindowEndPageNo: number
  }) {
    const positionList = this.draw.getCoordinate().getPositionList()
    patchArraySegment({
      list: positionList,
      startIndex: payload.startOffset,
      deleteCount: payload.deleteCount,
      itemList: payload.positionList
    })

    if (!payload.indexDelta && !payload.rowDelta && !payload.pageDelta) {
      this.draw.getCoordinate().setPositionList(positionList)
      return
    }

    const shiftStart = payload.startOffset + payload.positionList.length
    for (let i = shiftStart; i < positionList.length; i++) {
      const position = positionList[i]

      if (payload.indexDelta) {
        position.index += payload.indexDelta
      }
      if (payload.rowDelta) {
        position.rowIndex += payload.rowDelta
      }

      // 页码变化：只影响跨越旧窗口结束页的元素。
      if (payload.pageDelta && position.pageNo > payload.oldWindowEndPageNo) {
        position.pageNo += payload.pageDelta
      }
    }

    this.draw.getCoordinate().setPositionList(positionList)
  }
}
