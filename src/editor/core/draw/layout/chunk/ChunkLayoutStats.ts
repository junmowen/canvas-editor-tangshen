import {
  IChunkLayoutPatchResult,
  IChunkLayoutPipelineStats
} from './ChunkLayoutTypes'

/** chunk 布局统计收集器，避免主管线混入计数细节。 */
export class ChunkLayoutStats {
  /** 当前统计快照。 */
  private stats: IChunkLayoutPipelineStats = {
    attemptCount: 0,
    patchSuccessCount: 0,
    patchFailCount: 0,
    lastResult: null,
    lastFailReason: null,
    lastGuardDuration: 0,
    lastMeasureDuration: 0,
    lastPatchDuration: 0,
    totalGuardDuration: 0,
    totalMeasureDuration: 0,
    totalPatchDuration: 0,
    pageRebalanceSyncPatchCount: 0,
    pageRebalanceAsyncPatchCount: 0,
    pageRebalanceScheduleCount: 0,
    pageRebalanceBoundaryPropagateCount: 0,
    pageRebalanceMaxPendingPageCount: 0,
    pageRebalancePendingPageCount: 0,
    pageRebalanceLastAsyncPageNo: null,
    dirtyRangePlanCount: 0,
    dirtyRangeLastStartPageNo: null,
    dirtyRangeLastEndPageNo: null,
    dirtyRangeLastPageCount: 0,
    dirtyRangeLastReason: null,
    dirtyRangeLastIncludesTableRange: false,
    dirtyRangeMaxPageCount: 0,
    dirtyRangeMissActualCount: 0,
    dirtyRangeLastMissingActualPageCount: 0,
    dirtyRangeLastMissingActualPageNoList: [],
    dirtyRangeLastActualStartPageNo: null,
    dirtyRangeLastActualEndPageNo: null,
    dirtyRangeScheduleTakeoverCount: 0,
    dirtyRangeScheduleFallbackCount: 0
  }

  /** 记录一次 patch 尝试结果。 */
  public record(
    result: IChunkLayoutPatchResult,
    duration?: {
      guardDuration?: number
      measureDuration?: number
      patchDuration?: number
    }
  ) {
    const guardDuration = duration?.guardDuration ?? 0
    const measureDuration = duration?.measureDuration ?? 0
    const patchDuration = duration?.patchDuration ?? 0
    this.stats.attemptCount++
    this.stats.lastGuardDuration = guardDuration
    this.stats.lastMeasureDuration = measureDuration
    this.stats.lastPatchDuration = patchDuration
    this.stats.totalGuardDuration += guardDuration
    this.stats.totalMeasureDuration += measureDuration
    this.stats.totalPatchDuration += patchDuration
    if (result.patched) {
      this.stats.patchSuccessCount++
      this.stats.lastResult = 'patched'
      this.stats.lastFailReason = null
      return
    }
    this.stats.patchFailCount++
    this.stats.lastResult = 'failed'
    this.stats.lastFailReason = result.reason || 'unknown'
  }

  /** 获取统计快照。 */
  public getStats(): IChunkLayoutPipelineStats {
    return { ...this.stats }
  }

  /** 合并页级 rebalance 统计，保持 chunkLayout 一个出口。 */
  public mergePageRebalanceStats(stats: {
    syncPatchCount: number
    asyncPatchCount: number
    scheduleCount: number
    boundaryPropagateCount: number
    maxPendingPageCount: number
    pendingPageCount: number
    lastAsyncPageNo: number | null
    dirtyRangePlanCount: number
    dirtyRangeLastStartPageNo: number | null
    dirtyRangeLastEndPageNo: number | null
    dirtyRangeLastPageCount: number
    dirtyRangeLastReason: string | null
    dirtyRangeLastIncludesTableRange: boolean
    dirtyRangeMaxPageCount: number
    dirtyRangeMissActualCount: number
    dirtyRangeLastMissingActualPageCount: number
    dirtyRangeLastMissingActualPageNoList: number[]
    dirtyRangeLastActualStartPageNo: number | null
    dirtyRangeLastActualEndPageNo: number | null
    dirtyRangeScheduleTakeoverCount: number
    dirtyRangeScheduleFallbackCount: number
  }): IChunkLayoutPipelineStats {
    return {
      ...this.stats,
      pageRebalanceSyncPatchCount: stats.syncPatchCount,
      pageRebalanceAsyncPatchCount: stats.asyncPatchCount,
      pageRebalanceScheduleCount: stats.scheduleCount,
      pageRebalanceBoundaryPropagateCount: stats.boundaryPropagateCount,
      pageRebalanceMaxPendingPageCount: stats.maxPendingPageCount,
      pageRebalancePendingPageCount: stats.pendingPageCount,
      pageRebalanceLastAsyncPageNo: stats.lastAsyncPageNo,
      dirtyRangePlanCount: stats.dirtyRangePlanCount,
      dirtyRangeLastStartPageNo: stats.dirtyRangeLastStartPageNo,
      dirtyRangeLastEndPageNo: stats.dirtyRangeLastEndPageNo,
      dirtyRangeLastPageCount: stats.dirtyRangeLastPageCount,
      dirtyRangeLastReason: stats.dirtyRangeLastReason,
      dirtyRangeLastIncludesTableRange: stats.dirtyRangeLastIncludesTableRange,
      dirtyRangeMaxPageCount: stats.dirtyRangeMaxPageCount,
      dirtyRangeMissActualCount: stats.dirtyRangeMissActualCount,
      dirtyRangeLastMissingActualPageCount:
        stats.dirtyRangeLastMissingActualPageCount,
      dirtyRangeLastMissingActualPageNoList:
        stats.dirtyRangeLastMissingActualPageNoList,
      dirtyRangeLastActualStartPageNo: stats.dirtyRangeLastActualStartPageNo,
      dirtyRangeLastActualEndPageNo: stats.dirtyRangeLastActualEndPageNo,
      dirtyRangeScheduleTakeoverCount: stats.dirtyRangeScheduleTakeoverCount,
      dirtyRangeScheduleFallbackCount: stats.dirtyRangeScheduleFallbackCount
    }
  }

  /** 重置统计。 */
  public reset() {
    this.stats = {
      attemptCount: 0,
      patchSuccessCount: 0,
      patchFailCount: 0,
      lastResult: null,
      lastFailReason: null,
      lastGuardDuration: 0,
      lastMeasureDuration: 0,
      lastPatchDuration: 0,
      totalGuardDuration: 0,
      totalMeasureDuration: 0,
      totalPatchDuration: 0,
      pageRebalanceSyncPatchCount: 0,
      pageRebalanceAsyncPatchCount: 0,
      pageRebalanceScheduleCount: 0,
      pageRebalanceBoundaryPropagateCount: 0,
      pageRebalanceMaxPendingPageCount: 0,
      pageRebalancePendingPageCount: 0,
      pageRebalanceLastAsyncPageNo: null,
      dirtyRangePlanCount: 0,
      dirtyRangeLastStartPageNo: null,
      dirtyRangeLastEndPageNo: null,
      dirtyRangeLastPageCount: 0,
      dirtyRangeLastReason: null,
      dirtyRangeLastIncludesTableRange: false,
      dirtyRangeMaxPageCount: 0,
      dirtyRangeMissActualCount: 0,
      dirtyRangeLastMissingActualPageCount: 0,
      dirtyRangeLastMissingActualPageNoList: [],
      dirtyRangeLastActualStartPageNo: null,
      dirtyRangeLastActualEndPageNo: null,
      dirtyRangeScheduleTakeoverCount: 0,
      dirtyRangeScheduleFallbackCount: 0
    }
  }
}
