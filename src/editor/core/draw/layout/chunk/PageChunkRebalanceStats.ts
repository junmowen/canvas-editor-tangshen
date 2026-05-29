import { AsyncPageRebalanceQueue } from './AsyncPageRebalanceQueue'
import { IDirtyPageRangePlan } from './DirtyPageRangePlanner'

/** 页面分块rebalancestats契约，用于约束内部流程中传递的数据结构。 */
export interface IPageChunkRebalanceStats {
  /** 同步页窗口 patch 次数。 */
  syncPatchCount: number
  /** 异步页窗口 patch 次数。 */
  asyncPatchCount: number
  /** 异步传播调度次数。 */
  scheduleCount: number
  /** 窗口边界变化后继续传播次数。 */
  boundaryPropagateCount: number
  /** 异步队列历史最大待处理页数。 */
  maxPendingPageCount: number
  /** 当前仍在等待异步处理的页数。 */
  pendingPageCount: number
  /** 最近一次异步处理的页码。 */
  lastAsyncPageNo: number | null
  /** dirty range planner 旁路计算次数。 */
  dirtyRangePlanCount: number
  /** 最近一次 planner 输出起始页。 */
  dirtyRangeLastStartPageNo: number | null
  /** 最近一次 planner 输出结束页。 */
  dirtyRangeLastEndPageNo: number | null
  /** 最近一次 planner 输出页数。 */
  dirtyRangeLastPageCount: number
  /** 最近一次 planner 输出原因。 */
  dirtyRangeLastReason: string | null
  /** 最近一次 planner 是否覆盖表格范围。 */
  dirtyRangeLastIncludesTableRange: boolean
  /** planner 历史最大页数。 */
  dirtyRangeMaxPageCount: number
  /** planner 输出没有覆盖实际影响页的次数。 */
  dirtyRangeMissActualCount: number
  /** 最近一次实际影响页但未被 planner 覆盖的页数。 */
  dirtyRangeLastMissingActualPageCount: number
  /** 最近一次未覆盖的实际页码。 */
  dirtyRangeLastMissingActualPageNoList: number[]
  /** 最近一次实际影响页起始页。 */
  dirtyRangeLastActualStartPageNo: number | null
  /** 最近一次实际影响页结束页。 */
  dirtyRangeLastActualEndPageNo: number | null
  /** dirty range planner 接管异步传播起点次数。 */
  dirtyRangeScheduleTakeoverCount: number
  /** planner 漏实际页时回退旧异步传播起点次数。 */
  dirtyRangeScheduleFallbackCount: number
}

/** 页级 chunk rebalance 统计状态，避免 patcher 同时维护算法和指标字段。 */
export class PageChunkRebalanceStats {
  /** 当前统计快照。 */
  private stats: IPageChunkRebalanceStats = this.createEmptyStats()

  /** 初始化 PageChunkRebalanceStats 实例并注入运行依赖。 */
  constructor(private readonly asyncQueue: AsyncPageRebalanceQueue) {}

  /** 记录一次 patch 尝试。 */
  public recordPatch(payload: { isAsync: boolean; pageNo: number }) {
    if (payload.isAsync) {
      this.stats.asyncPatchCount++
      this.stats.lastAsyncPageNo = payload.pageNo
    } else {
      this.stats.syncPatchCount++
    }
  }

  /** 记录窗口边界变化后的继续传播。 */
  public recordBoundaryPropagate() {
    this.stats.boundaryPropagateCount++
  }

  /** 记录 dirty range planner 接管异步传播起点。 */
  public recordDirtyRangeScheduleTakeover() {
    this.stats.dirtyRangeScheduleTakeoverCount++
  }

  /** 记录 planner 漏页时回退旧传播起点。 */
  public recordDirtyRangeScheduleFallback() {
    this.stats.dirtyRangeScheduleFallbackCount++
  }

  /** 记录 dirty range planner 旁路结果。 */
  public recordDirtyRangePlan(payload: {
    plan: IDirtyPageRangePlan
    actualAffectedPageNoList: number[]
  }) {
    const { plan, actualAffectedPageNoList } = payload
    const missingActualPageNoList = actualAffectedPageNoList.filter(pageNo => {
      return pageNo < plan.startPageNo || pageNo > plan.endPageNo
    })
    const actualStartPageNo = actualAffectedPageNoList.length
      ? Math.min(...actualAffectedPageNoList)
      : null
    const actualEndPageNo = actualAffectedPageNoList.length
      ? Math.max(...actualAffectedPageNoList)
      : null
    this.stats.dirtyRangePlanCount++
    this.stats.dirtyRangeLastStartPageNo = plan.startPageNo
    this.stats.dirtyRangeLastEndPageNo = plan.endPageNo
    this.stats.dirtyRangeLastPageCount = plan.pageCount
    this.stats.dirtyRangeLastReason = plan.reason
    this.stats.dirtyRangeLastIncludesTableRange = plan.includesTableRange
    this.stats.dirtyRangeMaxPageCount = Math.max(
      this.stats.dirtyRangeMaxPageCount,
      plan.pageCount
    )
    this.stats.dirtyRangeLastMissingActualPageCount =
      missingActualPageNoList.length
    this.stats.dirtyRangeLastMissingActualPageNoList =
      missingActualPageNoList
    this.stats.dirtyRangeLastActualStartPageNo = actualStartPageNo
    this.stats.dirtyRangeLastActualEndPageNo = actualEndPageNo
    if (missingActualPageNoList.length > 0) {
      this.stats.dirtyRangeMissActualCount++
    }
  }

  /** 获取统计快照。 */
  public getStats(): IPageChunkRebalanceStats {
    const queueStats = this.asyncQueue.getStats()
    return {
      ...this.stats,
      scheduleCount: queueStats.scheduleCount,
      maxPendingPageCount: queueStats.maxPendingPageCount,
      pendingPageCount: queueStats.pendingPageCount
    }
  }

  /** 重置统计和异步队列。 */
  public reset() {
    this.asyncQueue.reset()
    this.stats = this.createEmptyStats()
  }

  /** 创建空统计。 */
  private createEmptyStats(): IPageChunkRebalanceStats {
    return {
      syncPatchCount: 0,
      asyncPatchCount: 0,
      scheduleCount: 0,
      boundaryPropagateCount: 0,
      maxPendingPageCount: 0,
      pendingPageCount: 0,
      lastAsyncPageNo: null,
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
