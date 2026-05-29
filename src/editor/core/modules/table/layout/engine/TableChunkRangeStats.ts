import {
  ITableChunkRange,
  ITableChunkRangeIndexStats
} from '../../../../draw/layout/ChunkDataTypes'

/** 表格 chunk 范围索引统计。 */
export class TableChunkRangeStats {
  private version = 0
  private lastBuildDuration = 0
  /** 最近一次表格分块统计重建原因。 */
  private lastBuildReason = 'init'
  /** 最近一次查询命中的逻辑表格 id。 */
  private lastLookupTableId: string | null = null
  private lastLookupPageSpan = 0

  /** 记录build，把当前命中结果写入缓存或统计。 */
  public recordBuild(reason: string, duration: number) {
    this.version++
    this.lastBuildReason = reason
    this.lastBuildDuration = duration
    this.lastLookupTableId = null
    this.lastLookupPageSpan = 0
  }

  /** 记录lookup，把当前命中结果写入缓存或统计。 */
  public recordLookup(range: ITableChunkRange | null) {
    this.lastLookupTableId = range?.logicalTableId ?? null
    this.lastLookupPageSpan = range
      ? range.endPageNo - range.startPageNo + 1
      : 0
  }

  /** 重置当前状态，清空缓存的中间结果或统计信息。 */
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
