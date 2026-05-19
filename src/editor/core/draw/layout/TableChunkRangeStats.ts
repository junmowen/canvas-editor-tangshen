import {
  ITableChunkRange,
  ITableChunkRangeIndexStats
} from './ChunkDataTypes'

/** 表格 chunk 范围索引统计。 */
export class TableChunkRangeStats {
  private version = 0
  private lastBuildDuration = 0
  private lastBuildReason = 'init'
  private lastLookupTableId: string | null = null
  private lastLookupPageSpan = 0

  public recordBuild(reason: string, duration: number) {
    this.version++
    this.lastBuildReason = reason
    this.lastBuildDuration = duration
    this.lastLookupTableId = null
    this.lastLookupPageSpan = 0
  }

  public recordLookup(range: ITableChunkRange | null) {
    this.lastLookupTableId = range?.logicalTableId ?? null
    this.lastLookupPageSpan = range
      ? range.endPageNo - range.startPageNo + 1
      : 0
  }

  public reset() {
    this.lastBuildDuration = 0
    this.lastBuildReason = 'reset'
    this.lastLookupTableId = null
    this.lastLookupPageSpan = 0
  }

  public getVersion() {
    return this.version
  }

  public getStats(
    rangeByTableIdMap: Map<string, ITableChunkRange>
  ): ITableChunkRangeIndexStats {
    let fragmentRangeCount = 0
    let cellRangeCount = 0
    rangeByTableIdMap.forEach(range => {
      fragmentRangeCount += range.fragmentRangeList.length
      cellRangeCount += range.cellRangeList.length
    })
    return {
      version: this.version,
      tableCount: rangeByTableIdMap.size,
      fragmentRangeCount,
      cellRangeCount,
      lastBuildDuration: this.lastBuildDuration,
      lastBuildReason: this.lastBuildReason,
      lastLookupTableId: this.lastLookupTableId,
      lastLookupPageSpan: this.lastLookupPageSpan
    }
  }
}
