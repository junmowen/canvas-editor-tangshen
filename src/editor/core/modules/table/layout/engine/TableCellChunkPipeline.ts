import type { Draw } from '../../../../draw/Draw'

export interface ITableCellChunkPatchResult {
  /** 是否成功同步写回当前可见单元格 fragment。 */
  patched: boolean
  /** 成功 patch 的页码。 */
  pageNo?: number
  /** 本次 patch 影响到的页码列表。 */
  affectedPageNoList?: number[]
  /** 失败原因。 */
  reason?: string
}

/** 表格单元格分块pipelinestats契约，用于约束内部流程中传递的数据结构。 */
export interface ITableCellChunkPipelineStats {
  /** patch 尝试次数。 */
  attemptCount: number
  /** patch 成功次数。 */
  patchSuccessCount: number
  /** patch 失败次数。 */
  patchFailCount: number
  /** 最近一次失败原因。 */
  lastFailReason: string | null
  /** 最近一次 patch 耗时。 */
  lastPatchDuration: number
  /** 累计 patch 耗时。 */
  totalPatchDuration: number
}

/** 表格单元格子 chunk 管线，负责当前可见 td fragment 的同步局部排版写回。 */
export class TableCellChunkPipeline {
  /** 当前 patch 统计。 */
  private stats: ITableCellChunkPipelineStats = {
    attemptCount: 0,
    patchSuccessCount: 0,
    patchFailCount: 0,
    lastFailReason: null,
    lastPatchDuration: 0,
    totalPatchDuration: 0
  }

  /** 关联的 Draw 聚合根。 */
  constructor(private readonly draw: Draw) {}

  /** patch 当前表格输入命中的可见单元格 fragment。 */
  public patchCurrentCell(payload: {
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex?: number
    /** 编辑索引，用于定位本次修改发生的位置。 */
    editIndex?: number
    /** 已插入数量，用于累加本次写入的元素个数。 */
    insertedCount: number
  }): ITableCellChunkPatchResult {
    const startTime = performance.now()
    this.stats.attemptCount++
    void payload
    const result = this.patchCurrentCellInternal()
    const duration = performance.now() - startTime
    this.stats.lastPatchDuration = duration
    this.stats.totalPatchDuration += duration
    if (result.patched) {
      this.stats.patchSuccessCount++
      this.stats.lastFailReason = null
    } else {
      this.stats.patchFailCount++
      this.stats.lastFailReason = result.reason || 'unknown'
    }
    return result
  }

  /** 获取当前统计快照。 */
  public getStats(): ITableCellChunkPipelineStats {
    return { ...this.stats }
  }

  /** 重置统计。 */
  public resetStats() {
    this.stats = {
      attemptCount: 0,
      patchSuccessCount: 0,
      patchFailCount: 0,
      lastFailReason: null,
      lastPatchDuration: 0,
      totalPatchDuration: 0
    }
  }

  /** 执行表格单元格当前 fragment 的同步 patch。 */
  private patchCurrentCellInternal(): ITableCellChunkPatchResult {
    void this.draw
    // 表格分页已恢复为原 TableLayoutEngine / TableFragmentSplitter 唯一真相。
    // 旧的手写 td 容量分发会制造第二套分页规则，当前必须保持关闭。
    return {
      patched: false,
      reason: 'table-cell-distributor-disabled'
    }
  }

}
