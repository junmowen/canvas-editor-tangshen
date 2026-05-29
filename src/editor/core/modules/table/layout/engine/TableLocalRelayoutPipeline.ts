import { RenderLayer } from '../../../../render-backend'
import type { Draw } from '../../../../draw/Draw'
import { TableLocalRelayoutMeasurer } from './TableLocalRelayoutMeasurer'
import { TableLocalRelayoutRuntimePatcher } from './TableLocalRelayoutRuntimePatcher'
import { TableLocalRelayoutStats } from './TableLocalRelayoutStats'
import { TableLocalRelayoutTargetResolver } from './TableLocalRelayoutTargetResolver'
import {
  ITableLocalRelayoutPatchResult,
  ITableLocalRelayoutStats
} from './TableLocalRelayoutTypes'

export type { ITableLocalRelayoutPatchResult, ITableLocalRelayoutStats }

/**
 * 表格级局部重分页管线。
 *
 * 目标是复用原 `TableLayoutEngine` / `TableFragmentSplitter` 的分页规则，
 * 只替换受影响逻辑表产生的 fragment 行，避免重新实现单元格容量算法。
 */
export class TableLocalRelayoutPipeline {
  /** 当前表格输入目标解析器。 */
  private readonly targetResolver: TableLocalRelayoutTargetResolver
  /** 表格局部重分页测量器。 */
  private readonly measurer: TableLocalRelayoutMeasurer
  /** 表格局部重分页运行时写回器。 */
  private readonly runtimePatcher: TableLocalRelayoutRuntimePatcher

  /** 当前局部重分页统计。 */
  private readonly stats = new TableLocalRelayoutStats()

  /** 关联的 Draw 聚合根。 */
  constructor(private readonly draw: Draw) {
    this.targetResolver = new TableLocalRelayoutTargetResolver(draw)
    this.measurer = new TableLocalRelayoutMeasurer(draw)
    this.runtimePatcher = new TableLocalRelayoutRuntimePatcher(draw)
  }

  /** 对当前表格输入尝试执行表格级局部重分页。 */
  public patchCurrentTable(): ITableLocalRelayoutPatchResult {
    const startTime = performance.now()
    this.stats.beginAttempt()
    const result = this.patchCurrentTableInternal()
    const duration = performance.now() - startTime
    this.stats.finishAttempt(result, duration)
    return result
  }

  /** 获取统计快照。 */
  public getStats(): ITableLocalRelayoutStats {
    return this.stats.getStats()
  }

  /** 重置统计，不改变当前布局结果。 */
  public resetStats() {
    this.stats.reset()
  }

  /** 执行真正的局部重分页；不满足安全边界时返回失败，让调用方走完整 layout。 */
  private patchCurrentTableInternal(): ITableLocalRelayoutPatchResult {
    const targetResult = this.targetResolver.resolveCurrentTarget()
    if (targetResult.logicalTableId) {
      this.stats.setLogicalTableId(targetResult.logicalTableId)
    }
    if (targetResult.scanStats) {
      this.stats.recordRuntimeRangeScan(targetResult.scanStats)
    }
    if (!targetResult.target) {
      return {
        patched: false,
        reason: targetResult.reason || 'runtime-table-range-miss'
      }
    }
    const { sourceTable, tableIndex, oldRange } = targetResult.target

    const measureResult = this.measurer.measureTablePageRows({
      sourceTable,
      tableIndex,
      runtimeRowStart: oldRange.runtimeRowStart,
      startRowIndex: oldRange.firstRow.rowIndex
    })
    if (!measureResult.pageRowList.length || !measureResult.rowList.length) {
      return { patched: false, reason: 'measure-empty' }
    }

    this.runtimePatcher.patch({
      oldRange,
      measureResult
    })

    const affectedPageNoList = this.getAffectedPageNoList({
      pageStart: oldRange.pageStart,
      oldPageCount: oldRange.pageCount,
      nextPageCount: measureResult.pageRowList.length
    })
    affectedPageNoList.forEach(pageNo => {
      this.draw
        .getPageCanvasHost()
        .invalidateBitmapCache(pageNo, RenderLayer.BASE)
    })

    return {
      patched: true,
      pageNo: oldRange.pageStart,
      affectedPageNoList
    }
  }

  /** 计算新旧页窗口合并后的受影响页码。 */
  private getAffectedPageNoList(payload: {
    /** 页面起始索引，用于定位当前页在文档元素列表中的起点。 */
    pageStart: number
    /** 旧页面数量，用于判断局部重排后的分页变化。 */
    oldPageCount: number
    /** 重排后的页面数量，用于比较分页变化。 */
    nextPageCount: number
  }) {
    const pageCount = Math.max(payload.oldPageCount, payload.nextPageCount)
    return Array.from({ length: pageCount }, (_, index) => payload.pageStart + index)
  }
}
