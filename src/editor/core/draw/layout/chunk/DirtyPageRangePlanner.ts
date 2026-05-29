import type { Draw } from '../../Draw'
import { IChunkLayoutPatchContext } from './ChunkLayoutTypes'
import { IPageChunkRebalanceResult } from './PageChunkRebalanceTypes'

/** 脏区页面范围plan契约，用于约束内部流程中传递的数据结构。 */
export interface IDirtyPageRangePlan {
  /** 建议失效起始页。 */
  startPageNo: number
  /** 建议失效结束页。 */
  endPageNo: number
  /** 输出原因，便于 debug 和 stats 分析。 */
  reason: string
  /** 是否命中表格父范围。 */
  includesTableRange: boolean
  /** 建议失效页数。 */
  pageCount: number
}

/** 页级输入影响范围规划器。第一阶段只旁路统计，不接管真实写回。 */
export class DirtyPageRangePlanner {
  /** 初始化 DirtyPageRangePlanner 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 根据当前页级 rebalance 结果规划本次 dirty page range。 */
  public plan(payload: {
    /** 当前操作上下文，汇总本次处理需要共享的状态。 */
    context: IChunkLayoutPatchContext
    /** 再平衡结果，用于把分页块调整同步回运行态。 */
    rebalanceResult: IPageChunkRebalanceResult
  }): IDirtyPageRangePlan {
    const { context, rebalanceResult } = payload
    let startPageNo = context.pageNo
    let endPageNo = Math.max(
      context.pageNo,
      context.pageNo +
        Math.max(
          rebalanceResult.oldPageCount,
          rebalanceResult.nextPageCount,
          rebalanceResult.measuredWindowPageCount
        ) -
        1,
      rebalanceResult.oldWindowEndPageNo
    )
    let reason = rebalanceResult.shouldPropagateNext
      ? 'boundary-propagate'
      : 'window-stable'
    const tableRange = this.draw
      .getServices()
      .tableChunkRangeIndex.findNearestRangeFromPage({
        pageNo: context.pageNo,
        maxForwardPageCount: Math.max(
          rebalanceResult.measuredWindowPageCount,
          rebalanceResult.nextPageCount,
          1
        )
      })
    let includesTableRange =
      Boolean(tableRange) &&
      tableRange!.endPageNo >= startPageNo &&
      tableRange!.startPageNo <= endPageNo
    if (includesTableRange && tableRange) {
      startPageNo = Math.min(startPageNo, tableRange.startPageNo)
      endPageNo = Math.max(
        endPageNo,
        tableRange.endPageNo,
        Math.min(this.draw.getPageRowList().length - 1, tableRange.endPageNo + 1)
      )
      reason = 'table-range'
    }
    if (
      rebalanceResult.requiresSurfaceClear &&
      rebalanceResult.affectedPageNoList.length
    ) {
      includesTableRange = true
      startPageNo = Math.min(
        startPageNo,
        ...rebalanceResult.affectedPageNoList
      )
      endPageNo = Math.max(endPageNo, ...rebalanceResult.affectedPageNoList)
      reason = 'table-affected-range'
    }
    const actualAffectedEndPageNo = rebalanceResult.affectedPageNoList.length
      ? Math.max(...rebalanceResult.affectedPageNoList)
      : 0
    const maxKnownPageNo = Math.max(
      0,
      this.draw.getPageRowList().length - 1,
      actualAffectedEndPageNo,
      context.pageNo + Math.max(rebalanceResult.nextPageCount, 1) - 1
    )
    endPageNo = Math.min(Math.max(startPageNo, endPageNo), maxKnownPageNo)
    return {
      startPageNo,
      endPageNo,
      reason,
      includesTableRange,
      pageCount: endPageNo - startPageNo + 1
    }
  }
}
