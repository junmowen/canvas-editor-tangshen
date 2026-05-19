import {
  ITableCellChunk,
  ITableCellChunkIndexStats
} from './ChunkDataTypes'

/** 表格单元格子 chunk 索引统计状态。 */
export class TableCellChunkStats {
  /** 当前索引版本。 */
  private version = 0
  /** 最近一次重建耗时。 */
  private lastBuildDuration = 0
  /** 最近一次重建原因。 */
  private lastBuildReason = 'init'
  /** 最近一次命中的逻辑 cell key。 */
  private lastDirtyCellKey: string | null = null
  /** 最近一次命中的 td 局部索引。 */
  private lastDirtyIndex: number | null = null
  /** 最近一次命中的子 chunk 编号。 */
  private lastDirtyChunkId: number | null = null
  /** 最近一次查找是否命中。 */
  private lastLookupHit = false

  /** 统一完成重建统计收尾。 */
  public finishRebuild(payload: {
    reason: string
    startTime: number
  }) {
    this.version++
    this.lastBuildReason = payload.reason
    this.lastBuildDuration = performance.now() - payload.startTime
    this.lastDirtyCellKey = null
    this.lastDirtyIndex = null
    this.lastDirtyChunkId = null
    this.lastLookupHit = false
  }

  /** 记录一次 dirty 查询结果。 */
  public recordDirtyLookup(payload: {
    cellKey: string | null
    index: number | null
    chunk: ITableCellChunk | null
  }) {
    this.lastDirtyCellKey = payload.cellKey
    this.lastDirtyIndex = payload.index
    this.lastDirtyChunkId = payload.chunk?.id ?? null
    this.lastLookupHit = Boolean(payload.chunk)
  }

  /** 记录一次未命中。 */
  public recordMiss() {
    this.lastLookupHit = false
  }

  /** 获取统计快照。 */
  public getStats(
    chunkListByCellKey: Map<string, ITableCellChunk[]>
  ): ITableCellChunkIndexStats {
    let chunkCount = 0
    let dirtyChunkCount = 0
    let maxChunkCountPerCell = 0
    let maxElementCount = 0
    let fragmentBoundChunkCount = 0
    chunkListByCellKey.forEach(chunkList => {
      chunkCount += chunkList.length
      maxChunkCountPerCell = Math.max(maxChunkCountPerCell, chunkList.length)
      chunkList.forEach(chunk => {
        if (chunk.dirty) {
          dirtyChunkCount++
        }
        maxElementCount = Math.max(maxElementCount, chunk.elementCount)
        if (chunk.fragmentTableId) {
          fragmentBoundChunkCount++
        }
      })
    })
    return {
      version: this.version,
      cellCount: chunkListByCellKey.size,
      chunkCount,
      dirtyChunkCount,
      maxChunkCountPerCell,
      maxElementCount,
      fragmentBoundChunkCount,
      lastBuildDuration: this.lastBuildDuration,
      lastBuildReason: this.lastBuildReason,
      lastDirtyCellKey: this.lastDirtyCellKey,
      lastDirtyIndex: this.lastDirtyIndex,
      lastDirtyChunkId: this.lastDirtyChunkId,
      lastLookupHit: this.lastLookupHit
    }
  }

  /** 重置统计。 */
  public reset() {
    this.version = 0
    this.lastBuildDuration = 0
    this.lastBuildReason = 'reset'
    this.lastDirtyCellKey = null
    this.lastDirtyIndex = null
    this.lastDirtyChunkId = null
    this.lastLookupHit = false
  }
}
