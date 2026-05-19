import type { Draw } from '../Draw'
import { ChunkLayoutMeasurer } from './chunk/ChunkLayoutMeasurer'
import { ChunkLayoutStats } from './chunk/ChunkLayoutStats'
import {
  IChunkLayoutPatchResult,
  IChunkLayoutPipelineStats
} from './chunk/ChunkLayoutTypes'
import { ChunkPatchGuard } from './chunk/ChunkPatchGuard'
import { ChunkRuntimePatcher } from './chunk/ChunkRuntimePatcher'
import { PageChunkRebalancePatcher } from './chunk/PageChunkRebalancePatcher'

/**
 * chunk 布局管线。
 *
 * 主管线只负责编排：安全判定 -> 局部测量 -> 运行时写回 -> 统计。
 * 具体规则放到独立模块，避免跨页、表格、分页传播等后续能力互相影响。
 */
export class ChunkLayoutPipeline {
  /** patch 安全判定器。 */
  private readonly guard: ChunkPatchGuard
  /** chunk 局部测量器。 */
  private readonly measurer: ChunkLayoutMeasurer
  /** 运行时写回器。 */
  private readonly runtimePatcher: ChunkRuntimePatcher
  /** 页级 chunk 重平衡器。 */
  private readonly pageChunkRebalancePatcher: PageChunkRebalancePatcher
  /** patch 统计收集器。 */
  private readonly stats: ChunkLayoutStats

  /** 关联的 Draw 门面。 */
  constructor(draw: Draw) {
    this.guard = new ChunkPatchGuard(draw)
    this.measurer = new ChunkLayoutMeasurer(draw)
    this.runtimePatcher = new ChunkRuntimePatcher(draw)
    this.pageChunkRebalancePatcher = new PageChunkRebalancePatcher(draw)
    this.stats = new ChunkLayoutStats()
  }

  /**
   * 尝试 patch 当前输入命中的 chunk。
   *
   * @param curIndex - 当前逻辑光标索引
   * @param insertedCount - 本次输入插入的元素数量
   * @returns patch 结果
   */
  public patchAroundIndex(
    curIndex: number | undefined,
    insertedCount = 0
  ): IChunkLayoutPatchResult {
    const guardStartTime = performance.now()
    const { context, result: guardResult } = this.guard.resolveContext(
      curIndex,
      insertedCount
    )
    const guardDuration = performance.now() - guardStartTime
    if (!context) {
      this.stats.record(guardResult, { guardDuration })
      return guardResult
    }
    if (context.chunk.kind === 'page') {
      const patchStartTime = performance.now()
      const result = this.pageChunkRebalancePatcher.patch(context)
      const patchDuration = performance.now() - patchStartTime
      this.stats.record(result, {
        guardDuration,
        patchDuration
      })
      return result
    }
    const measureStartTime = performance.now()
    const { measureResult, result: measurePatchResult } =
      this.measurer.measure(context)
    const measureDuration = performance.now() - measureStartTime
    if (!measureResult) {
      this.stats.record(measurePatchResult, {
        guardDuration,
        measureDuration
      })
      return measurePatchResult
    }
    const patchStartTime = performance.now()
    this.runtimePatcher.patch(context, measureResult)
    const patchDuration = performance.now() - patchStartTime
    context.chunk.dirty = false
    const result: IChunkLayoutPatchResult = {
      patched: true,
      pageNo: context.pageNo
    }
    this.stats.record(result, {
      guardDuration,
      measureDuration,
      patchDuration
    })
    return result
  }

  /** 获取 chunk 布局管线统计。 */
  public getStats(): IChunkLayoutPipelineStats {
    return this.stats.mergePageRebalanceStats(
      this.pageChunkRebalancePatcher.getStats()
    )
  }

  /** 重置 chunk 布局统计。 */
  public resetStats() {
    this.stats.reset()
    this.pageChunkRebalancePatcher.resetStats()
  }

  /** 清空页级异步传播队列，完整 layout 已经覆盖派生状态时使用。 */
  public resetPageRebalanceQueue() {
    this.pageChunkRebalancePatcher.clearPendingQueue()
  }
}
