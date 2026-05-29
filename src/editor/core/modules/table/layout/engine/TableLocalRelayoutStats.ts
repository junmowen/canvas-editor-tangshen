import {
  ITableLocalRelayoutPatchResult,
  ITableLocalRelayoutStats
} from './TableLocalRelayoutTypes'

/** 表格局部重分页统计器。 */
export class TableLocalRelayoutStats {
  private stats: ITableLocalRelayoutStats = this.createEmptyStats()

  public beginAttempt() {
    this.stats.attemptCount++
  }

  public finishAttempt(
    result: ITableLocalRelayoutPatchResult,
    duration: number
  ) {
    this.stats.lastDuration = duration
    this.stats.totalDuration += duration
    this.stats.maxDuration = Math.max(this.stats.maxDuration, duration)
    if (result.patched) {
      this.stats.patchSuccessCount++
      this.stats.lastFailReason = null
    } else {
      this.stats.patchFailCount++
      this.stats.lastFailReason = result.reason || 'unknown'
    }
  }

  public setLogicalTableId(logicalTableId: string | null) {
    this.stats.lastLogicalTableId = logicalTableId
  }

  /** 记录runtime范围scan，把当前命中结果写入缓存或统计。 */
  public recordRuntimeRangeScan(payload: {
    /** 快照切片数量，用于统计局部重排读取的表格片段规模。 */
    snapshotSliceCount: number
    /** 匹配到的表格片段数量，用于评估局部重排命中情况。 */
    matchedFragmentTableCount: number
    /** 已扫描表格行数，用于评估表格局部重排范围。 */
    scannedTableRowCount: number
  }) {
    this.stats.lastSnapshotSliceCount = payload.snapshotSliceCount
    this.stats.lastMatchedFragmentTableCount =
      payload.matchedFragmentTableCount
    this.stats.lastScannedTableRowCount = payload.scannedTableRowCount
  }

  public getStats(): ITableLocalRelayoutStats {
    return { ...this.stats }
  }

  /** 重置当前状态，清空缓存的中间结果或统计信息。 */
  public reset() {
    this.stats = this.createEmptyStats()
  }

  private createEmptyStats(): ITableLocalRelayoutStats {
    return {
      attemptCount: 0,
      patchSuccessCount: 0,
      patchFailCount: 0,
      lastFailReason: null,
      lastDuration: 0,
      totalDuration: 0,
      maxDuration: 0,
      lastLogicalTableId: null,
      lastSnapshotSliceCount: 0,
      lastMatchedFragmentTableCount: 0,
      lastScannedTableRowCount: 0
    }
  }
}
