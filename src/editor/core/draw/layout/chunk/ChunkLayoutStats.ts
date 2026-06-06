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
    dirtyRangeScheduleCorrectionCount: 0
  }

  /** 记录一次 patch 尝试结果。 */
  public record(
    result: IChunkLayoutPatchResult,
    duration?: {
      /** guardduration数值，用于当前布局、统计或索引计算。 */
      guardDuration?: number
      /** measureduration数值，用于当前布局、统计或索引计算。 */
      measureDuration?: number
      /** 补丁duration数值，用于当前布局、统计或索引计算。 */
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
    /** sync补丁count，用于统计当前场景的发生次数。 */
    syncPatchCount: number
    /** async补丁count，用于统计当前场景的发生次数。 */
    asyncPatchCount: number
    /** schedulecount，用于统计当前场景的发生次数。 */
    scheduleCount: number
    /** boundarypropagatecount，用于统计当前场景的发生次数。 */
    boundaryPropagateCount: number
    /** 最大待处理页面count，用于统计当前场景的发生次数。 */
    maxPendingPageCount: number
    /** 待处理页面count，用于统计当前场景的发生次数。 */
    pendingPageCount: number
    /** lastasync页面no，用于定位对应页、行或序号。 */
    lastAsyncPageNo: number | null
    /** 脏区范围plancount，用于统计当前场景的发生次数。 */
    dirtyRangePlanCount: number
    /** 脏区范围last起始页面no，用于定位对应页、行或序号。 */
    dirtyRangeLastStartPageNo: number | null
    /** 脏区范围last结束页面no，用于定位对应页、行或序号。 */
    dirtyRangeLastEndPageNo: number | null
    /** 脏区范围last页面count，用于统计当前场景的发生次数。 */
    dirtyRangeLastPageCount: number
    /** 脏区范围lastreason文本，用于标识、展示或匹配当前对象。 */
    dirtyRangeLastReason: string | null
    /** 脏区范围lastincludes表格范围，用于描述布局或命中的空间范围。 */
    dirtyRangeLastIncludesTableRange: boolean
    /** 脏区范围最大页面count，用于统计当前场景的发生次数。 */
    dirtyRangeMaxPageCount: number
    /** 脏区范围missactualcount，用于统计当前场景的发生次数。 */
    dirtyRangeMissActualCount: number
    /** 脏区范围lastmissingactual页面count，用于统计当前场景的发生次数。 */
    dirtyRangeLastMissingActualPageCount: number
    dirtyRangeLastMissingActualPageNoList: number[]
    /** 脏区范围lastactual起始页面no，用于定位对应页、行或序号。 */
    dirtyRangeLastActualStartPageNo: number | null
    /** 脏区范围lastactual结束页面no，用于定位对应页、行或序号。 */
    dirtyRangeLastActualEndPageNo: number | null
    /** 脏区范围scheduletakeovercount，用于统计当前场景的发生次数。 */
    dirtyRangeScheduleTakeoverCount: number
    /** 脏区范围schedule修正count，用于统计当前场景的发生次数。 */
    dirtyRangeScheduleCorrectionCount: number
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
      dirtyRangeScheduleCorrectionCount: stats.dirtyRangeScheduleCorrectionCount
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
      dirtyRangeScheduleCorrectionCount: 0
    }
  }
}
