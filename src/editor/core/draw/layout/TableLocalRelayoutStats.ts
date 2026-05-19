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

  public recordRuntimeRangeScan(payload: {
    snapshotSliceCount: number
    matchedFragmentTableCount: number
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
