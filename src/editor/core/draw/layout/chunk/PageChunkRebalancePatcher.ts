import { EditorZone } from '../../../../dataset/enum/Editor'
import { IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import { RenderLayer } from '../../../render-backend'
import type { Draw } from '../../Draw'
import { PagePartitioner } from '../PagePartitioner'
import {
  IChunkLayoutPatchContext,
  IChunkLayoutPatchResult
} from './ChunkLayoutTypes'
import {
  IPageChunkRebalanceResult
} from './PageChunkRebalanceTypes'
import { AsyncPageRebalanceQueue } from './AsyncPageRebalanceQueue'
import { isChunkDebugEnabled, logChunkDebug } from './ChunkDebugLogger'
import {
  DirtyPageRangePlanner,
  IDirtyPageRangePlan
} from './DirtyPageRangePlanner'
import {
  IPageChunkRebalanceStats,
  PageChunkRebalanceStats
} from './PageChunkRebalanceStats'
import { PageChunkRuntimePatcher } from './PageChunkRuntimePatcher'
import { PageChunkWindowPlanner } from './PageChunkWindowPlanner'

export type { IPageChunkRebalanceStats }

/** 页级 chunk 重平衡器，负责当前页和邻近页之间的行搬移。 */
export class PageChunkRebalancePatcher {
  /** 分页拆分器，复用完整布局的页高规则。 */
  private readonly pagePartitioner: PagePartitioner
  /** 异步页窗口传播队列。 */
  private readonly asyncQueue: AsyncPageRebalanceQueue
  /** 页级 rebalance 统计。 */
  private readonly stats: PageChunkRebalanceStats
  /** 页级窗口规划器。 */
  private readonly windowPlanner: PageChunkWindowPlanner
  /** 页级窗口运行时写回器。 */
  private readonly runtimePatcher: PageChunkRuntimePatcher
  /** dirty page range 旁路规划器。 */
  private readonly dirtyRangePlanner: DirtyPageRangePlanner

  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {
    this.pagePartitioner = new PagePartitioner(draw)
    this.windowPlanner = new PageChunkWindowPlanner(draw)
    this.runtimePatcher = new PageChunkRuntimePatcher(draw)
    this.dirtyRangePlanner = new DirtyPageRangePlanner(draw)
    this.asyncQueue = new AsyncPageRebalanceQueue(
      () => this.draw.getPageRowList().length,
      pageNo => this.patchPageNoAsync(pageNo),
      () => this.draw.getServices().documentChunkIndex.getVersion()
    )
    this.stats = new PageChunkRebalanceStats(this.asyncQueue)
  }

  /**
   * 对页级 chunk 执行窗口重平衡。
   *
   * 当前页重新排版后，如果页尾多出几行，就把这些行自然分配到下一页；
   * 如果当前页删除后缺几行，下一页开头的行也会自然补回当前页。
   */
  public patch(
    context: IChunkLayoutPatchContext,
    options: { isAsync?: boolean } = {}
  ): IChunkLayoutPatchResult {
    this.stats.recordPatch({
      isAsync: Boolean(options.isAsync),
      pageNo: context.pageNo
    })
    if (context.chunk.kind !== 'page') {
      return { patched: false, reason: 'not-page-chunk' }
    }
    const windowSizeResult = options.isAsync
      ? this.windowPlanner.resolveAsyncWindowSize(context)
      : this.windowPlanner.resolveSyncWindowSizeWithFallback(context)
    if (windowSizeResult.requiresFullLayout) {
      return {
        patched: false,
        requiresFullLayout: true,
        reason: 'table-beyond-window-requires-full-layout'
      }
    }
    const windowSize = windowSizeResult.size
    const windowChunkList = this.draw
      .getServices()
      .documentChunkIndex.getPageChunkWindow(context.chunk, windowSize)
    if (isChunkDebugEnabled()) {
      logChunkDebug('page-rebalance:start', {
        isAsync: Boolean(options.isAsync),
        pageNo: context.pageNo,
        chunkStartIndex: context.chunk.startIndex,
        chunkEndIndex: context.chunk.endIndex,
        insertedCount: context.insertedCount,
        windowSize,
        windowChunkList: windowChunkList.map(chunk => ({
          pageNo: chunk.pageNo,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex
        })),
        pageCount: this.draw.getPageRowList().length,
        positionCount: this.draw.getPosition().getLayoutMainPositionList().length,
        layoutElementCount: this.draw.getLayoutMainElementList().length,
        tableSnapshotVersion: this.draw.getTableLayoutSnapshotVersion()
      })
    }
    if (!windowChunkList.length) {
      return { patched: false, reason: 'page-window-miss' }
    }
    const rebalanceResult = this.measureWindow(context, windowChunkList)
    if (!rebalanceResult) {
      return { patched: false, reason: 'page-window-empty' }
    }
    const dirtyRangePlan = this.recordDirtyRangePlan(context, rebalanceResult)
    this.runtimePatcher.patch(context, rebalanceResult)
    if (rebalanceResult.shouldPropagateNext) {
      // 从新窗口尾页继续传播：插入扩页时尾页要和旧下一页合并；删除缩页时当前尾页要继续向后补行。
      const nextAsyncPageNo = this.resolveNextAsyncPageNo(
        context,
        rebalanceResult,
        dirtyRangePlan
      )
      if (nextAsyncPageNo !== null) {
        this.stats.recordBoundaryPropagate()
        this.scheduleAsyncPageRebalance(nextAsyncPageNo)
      }
    }
    if (options.isAsync) {
      this.refreshVisiblePagesAfterAsyncPatch(context.pageNo, rebalanceResult)
    }
    return {
      patched: true,
      pageNo: context.pageNo,
      affectedPageNoList: rebalanceResult.affectedPageNoList,
      requiresSurfaceClear: rebalanceResult.requiresSurfaceClear
    }
  }

  /** 记录 dirty range planner 输出，供 stats 和异步传播起点使用。 */
  private recordDirtyRangePlan(
    context: IChunkLayoutPatchContext,
    rebalanceResult: IPageChunkRebalanceResult
  ): IDirtyPageRangePlan {
    const dirtyRangePlan = this.dirtyRangePlanner.plan({
      context,
      rebalanceResult
    })
    this.stats.recordDirtyRangePlan({
      plan: dirtyRangePlan,
      actualAffectedPageNoList: rebalanceResult.affectedPageNoList
    })
    if (isChunkDebugEnabled()) {
      logChunkDebug('page-rebalance:dirty-range-plan', {
        pageNo: context.pageNo,
        startPageNo: dirtyRangePlan.startPageNo,
        endPageNo: dirtyRangePlan.endPageNo,
        pageCount: dirtyRangePlan.pageCount,
        reason: dirtyRangePlan.reason,
        includesTableRange: dirtyRangePlan.includesTableRange,
        affectedPageNoList: rebalanceResult.affectedPageNoList
      })
    }
    return dirtyRangePlan
  }

  /** 解析下一轮异步传播起点；表格窗口不能从表格尾页内部再次单页重排。 */
  private resolveNextAsyncPageNo(
    context: IChunkLayoutPatchContext,
    rebalanceResult: IPageChunkRebalanceResult,
    dirtyRangePlan: IDirtyPageRangePlan
  ) {
    const legacyNextPageNo =
      context.pageNo + Math.max(0, rebalanceResult.nextPageCount - 1)
    const isDirtyRangeSafe = rebalanceResult.affectedPageNoList.every(pageNo => {
      return (
        pageNo >= dirtyRangePlan.startPageNo &&
        pageNo <= dirtyRangePlan.endPageNo
      )
    })
    const nextPageNo = isDirtyRangeSafe
      ? dirtyRangePlan.endPageNo + 1
      : legacyNextPageNo
    if (isDirtyRangeSafe) {
      this.stats.recordDirtyRangeScheduleTakeover()
    } else {
      this.stats.recordDirtyRangeScheduleFallback()
    }
    if (!rebalanceResult.requiresSurfaceClear) {
      return nextPageNo
    }
    const tableRange = this.draw
      .getServices()
      .tableChunkRangeIndex.findNearestRangeFromPage({
        pageNo: context.pageNo,
        maxForwardPageCount: this.windowPlanner.getMaxTableAwareWindowSize()
      })
    if (!tableRange || nextPageNo > tableRange.endPageNo) {
      return nextPageNo
    }
    const afterTablePageNo = tableRange.endPageNo + 1
    if (afterTablePageNo >= this.draw.getPageRowList().length) {
      if (isChunkDebugEnabled()) {
        logChunkDebug('page-rebalance:skip-table-tail-async', {
          pageNo: context.pageNo,
          nextPageNo,
          tableStartPageNo: tableRange.startPageNo,
          tableEndPageNo: tableRange.endPageNo,
          pageCount: this.draw.getPageRowList().length
        })
      }
      return null
    }
    if (isChunkDebugEnabled()) {
      logChunkDebug('page-rebalance:skip-table-tail-async', {
        pageNo: context.pageNo,
        nextPageNo,
        afterTablePageNo,
        tableStartPageNo: tableRange.startPageNo,
        tableEndPageNo: tableRange.endPageNo,
        pageCount: this.draw.getPageRowList().length
      })
    }
    return afterTablePageNo
  }

  /** 获取页级 rebalance 统计。 */
  public getStats(): IPageChunkRebalanceStats {
    return this.stats.getStats()
  }

  /** 重置页级 rebalance 统计和待处理队列。 */
  public resetStats() {
    this.stats.reset()
  }

  /** 完整 layout 已经覆盖派生状态时，仅清空页级异步传播队列。 */
  public clearPendingQueue() {
    this.asyncQueue.clearPending()
  }

  /** 测量当前页窗口，并按页高重新拆分成相邻 chunk。 */
  private measureWindow(
    context: IChunkLayoutPatchContext,
    windowChunkList: IChunkLayoutPatchContext['chunk'][]
  ): IPageChunkRebalanceResult | null {
    const elementList = this.draw.getElementList()
    const firstChunk = windowChunkList[0]
    const startIndex = firstChunk.startIndex
    const oldWindowPageCount = this.windowPlanner.resolveMeasuredWindowPageCount({
      startPageNo: context.pageNo,
      windowChunkList
    })
    const oldWindowEndPageNo = context.pageNo + oldWindowPageCount - 1
    const oldEndIndex = this.windowPlanner.resolveWindowEndIndex({
      fallbackChunkList: windowChunkList,
      startPageNo: context.pageNo,
      pageCount: oldWindowPageCount,
      elementList
    })
    const endIndex = this.windowPlanner.resolveMeasureEndIndex({
      context,
      windowChunkList,
      startIndex,
      oldEndIndex,
      elementList
    })
    if (endIndex < startIndex) {
      return null
    }
    const windowElementList = elementList.slice(startIndex, endIndex + 1)
    const rowList = this.draw.computeRowList({
      startX: context.startX,
      startY: context.startY,
      pageHeight: this.draw.getHeight(),
      mainOuterHeight: this.draw.getMainOuterHeight(),
      isPagingMode: true,
      innerWidth: context.innerWidth,
      surroundElementList: [],
      elementList: windowElementList,
      sourceStartIndex: startIndex
    })
    const partitionResult = this.pagePartitioner.partitionRows(
      rowList,
      windowElementList
    )
    const oldWindowPageRowList = this.runtimePatcher.getOldWindowPageRows(
      context.pageNo,
      oldWindowPageCount
    )
    const nextPageRowList = partitionResult.pageRowList
    if (!nextPageRowList.length) {
      return null
    }
    this.normalizeWindowRows({
      pageRowList: nextPageRowList,
      startIndex,
      startPageNo: context.pageNo,
      startRowIndex: oldWindowPageRowList[0]?.[0]?.rowIndex ?? 0
    })
    const positionList = this.computeWindowPositionList({
      pageRowList: nextPageRowList,
      startPageNo: context.pageNo
    })
    const oldTableAffectedPageNoList = this.draw
      .getServices()
      .tableChunkRangeIndex.getAffectedPageNoListForWindow(
        context.pageNo,
        oldWindowPageRowList.length
      )
    const shouldSyncTableDescendants =
      oldTableAffectedPageNoList.length > 0 ||
      this.runtimePatcher.hasTableRows(oldWindowPageRowList) ||
      this.runtimePatcher.hasTableRows(nextPageRowList)
    if (isChunkDebugEnabled()) {
      logChunkDebug('page-rebalance:measure', {
        pageNo: context.pageNo,
        startIndex,
        oldEndIndex,
        endIndex,
        oldWindowPageCount,
        oldWindowEndPageNo,
        oldWindowRowsPerPage: oldWindowPageRowList.map(
          pageRows => pageRows.length
        ),
        nextRowsPerPage: nextPageRowList.map(pageRows => pageRows.length),
        oldTableAffectedPageNoList,
        shouldSyncTableDescendants,
        hasOldTableRows: this.runtimePatcher.hasTableRows(oldWindowPageRowList),
        hasNextTableRows: this.runtimePatcher.hasTableRows(nextPageRowList)
      })
    }
    return {
      startIndex,
      oldElementCount: Math.max(0, oldEndIndex - startIndex + 1),
      elementList: windowElementList,
      pageRowList: nextPageRowList,
      positionList,
      oldRowCount: oldWindowPageRowList.reduce(
        (count, pageRows) => count + pageRows.length,
        0
      ),
      nextRowCount: nextPageRowList.reduce(
        (count, pageRows) => count + pageRows.length,
        0
      ),
      oldPageCount: oldWindowPageRowList.length,
      nextPageCount: nextPageRowList.length,
      oldWindowEndPageNo,
      shouldPropagateNext: this.shouldPropagateNext({
        windowChunkList,
        pageRowList: nextPageRowList,
        insertedCount: context.insertedCount
      }),
      affectedPageNoList: this.createAffectedPageNoList({
        startPageNo: context.pageNo,
        oldPageCount: oldWindowPageRowList.length,
        nextPageCount: nextPageRowList.length,
        shouldIncludeWindow: shouldSyncTableDescendants,
        tableAffectedPageNoList: oldTableAffectedPageNoList
      }),
      requiresSurfaceClear: shouldSyncTableDescendants,
      measuredWindowPageCount: oldWindowPageCount
    }
  }

  /** 调度下一页窗口异步同步，按页传播溢出或缺口。 */
  private scheduleAsyncPageRebalance(pageNo: number) {
    this.asyncQueue.schedule(pageNo)
  }

  /** 异步同步指定页和下一页的页级 chunk。 */
  private patchPageNoAsync(pageNo: number) {
    const documentChunkIndex = this.draw.getServices().documentChunkIndex
    const chunk = documentChunkIndex.getPageChunkByPageNo(pageNo)
    if (!chunk || chunk.startPageNo === null) {
      return
    }
    const pageRows = this.draw.getPageRowList()[pageNo] || []
    if (!pageRows.length) {
      return
    }
    const margins = this.draw.getMargins()
    this.patch(
      {
        chunk,
        pageNo,
        oldChunkRows: pageRows,
        oldPageRowStart: 0,
        chunkElementList: this.draw
          .getElementList()
          .slice(chunk.startIndex, chunk.endIndex + 1),
        endIndex: chunk.endIndex,
        oldEndIndex: chunk.endIndex,
        insertedCount: 0,
        startX: margins[3],
        startY: margins[0] + this.draw.getHeader().getExtraHeight(),
        innerWidth: this.draw.getInnerWidth()
      },
      { isAsync: true }
    )
  }

  /** 把窗口内相对行索引转换为整篇文档索引。 */
  private normalizeWindowRows(payload: {
    pageRowList: IRow[][]
    startIndex: number
    startPageNo: number
    startRowIndex: number
  }) {
    let rowIndex = payload.startRowIndex
    for (let pageOffset = 0; pageOffset < payload.pageRowList.length; pageOffset++) {
      const pageRows = payload.pageRowList[pageOffset]
      for (let rowNo = 0; rowNo < pageRows.length; rowNo++) {
        const row = pageRows[rowNo]
        row.startIndex = payload.startIndex + row.startIndex
        row.rowIndex = rowIndex
        ;(row as IRow & { rowNo: number }).rowNo = rowNo
        rowIndex++
      }
    }
  }

  /** 计算窗口内所有页的位置列表。 */
  private computeWindowPositionList(payload: {
    pageRowList: IRow[][]
    startPageNo: number
  }): IElementPosition[] {
    const positionList: IElementPosition[] = []
    const margins = this.draw.getMargins()
    const startX = margins[3]
    const startY = margins[0] + this.draw.getHeader().getExtraHeight()
    const innerWidth = this.draw.getInnerWidth()
    for (let pageOffset = 0; pageOffset < payload.pageRowList.length; pageOffset++) {
      const rowList = payload.pageRowList[pageOffset]
      if (!rowList.length) {
        continue
      }
      this.draw.getPosition().computePageRowPosition({
        positionList,
        rowList,
        pageNo: payload.startPageNo + pageOffset,
        startX,
        startY,
        startRowIndex: rowList[0].rowIndex,
        startIndex: rowList[0].startIndex,
        innerWidth,
        zone: EditorZone.MAIN
      })
    }
    return positionList
  }

  /** 判断窗口尾页边界是否变化，变化时需要继续同步下一页。 */
  private shouldPropagateNext(payload: {
    windowChunkList: IChunkLayoutPatchContext['chunk'][]
    pageRowList: IRow[][]
    insertedCount: number
  }) {
    if (payload.pageRowList.length !== payload.windowChunkList.length) {
      return true
    }
    if (payload.insertedCount < 0) {
      return true
    }
    const lastChunk = payload.windowChunkList[payload.windowChunkList.length - 1]
    const lastPageRows = payload.pageRowList[payload.pageRowList.length - 1]
    const lastRow = lastPageRows?.[lastPageRows.length - 1]
    if (!lastChunk || !lastRow) {
      return false
    }
    const nextEndIndex =
      lastRow.startIndex + Math.max(0, lastRow.elementList.length - 1)
    return nextEndIndex !== lastChunk.endIndex + payload.insertedCount
  }

  /** 异步页同步完成后刷新受影响可见页。 */
  private refreshVisiblePagesAfterAsyncPatch(
    pageNo: number,
    rebalanceResult: IPageChunkRebalanceResult
  ) {
    if (isChunkDebugEnabled()) {
      logChunkDebug('page-rebalance:async-refresh', {
        pageNo,
        affectedPageNoList: rebalanceResult.affectedPageNoList,
        requiresSurfaceClear: rebalanceResult.requiresSurfaceClear,
        oldPageCount: rebalanceResult.oldPageCount,
        nextPageCount: rebalanceResult.nextPageCount,
        pageCount: this.draw.getPageRowList().length
      })
    }
    const renderInvalidationManager =
      this.draw.getServices().renderInvalidationManager
    renderInvalidationManager.markBaseBitmapDirty()
    const pageCount = Math.max(
      rebalanceResult.oldPageCount,
      rebalanceResult.nextPageCount
    )
    for (let offset = 0; offset < pageCount; offset++) {
      this.draw
        .getPageCanvasHost()
        .invalidateBitmapCache(pageNo + offset, RenderLayer.BASE)
    }
    if (rebalanceResult.requiresSurfaceClear) {
      this.clearAffectedSurfaces(rebalanceResult.affectedPageNoList)
    }
    this.draw.enqueueExtraVisibleRenderPages(rebalanceResult.affectedPageNoList)
    this.draw.getPageCanvasHost().setPageCount(this.draw.getPageRowList().length)
    this.draw.getServices().renderPipeline.render({
      isLazy: false,
      pageRenderScope: 'visible'
    })
  }

  /** 强制清理表格迁移影响页的 base / overlay，避免异步传播后留下旧表格线。 */
  private clearAffectedSurfaces(pageNoList: number[]) {
    pageNoList.forEach(pageNo => {
      this.draw.getServices().pageRenderer.clearPage(pageNo)
      this.draw.getTableOverlayRenderer().clearPage(pageNo)
      this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.BASE)
      this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.OVERLAY)
    })
    this.draw.getComponents().tableTool.dispose()
  }

  /** 生成旧页窗口和新页窗口的并集，确保父 chunk 移动后旧表格页也被重绘清空。 */
  private createAffectedPageNoList(payload: {
    startPageNo: number
    oldPageCount: number
    nextPageCount: number
    shouldIncludeWindow: boolean
    tableAffectedPageNoList: number[]
  }) {
    if (!payload.shouldIncludeWindow) {
      return [payload.startPageNo]
    }
    const pageNoSet = new Set<number>()
    const pageCount = Math.max(payload.oldPageCount, payload.nextPageCount)
    for (let offset = 0; offset < pageCount; offset++) {
      pageNoSet.add(payload.startPageNo + offset)
    }
    payload.tableAffectedPageNoList.forEach(pageNo => pageNoSet.add(pageNo))
    return Array.from(pageNoSet)
  }

}
