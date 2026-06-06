/**
 * 布局流水线统计。
 *
 * 用于区分整篇布局里到底卡在行布局、分页、位置、快照还是高亮计算。
 */
export interface IDrawLayoutPipelineStats {
  /** 累计布局次数。 */
  computeCount: number
  /** 最近一次整篇布局总耗时。 */
  lastDuration: number
  /** 累计整篇布局总耗时。 */
  totalDuration: number
  /** 平均整篇布局耗时。 */
  averageDuration: number
  /** 最大整篇布局耗时。 */
  maxDuration: number
  /** 行布局阶段耗时。 */
  lastRowLayoutDuration: number
  /** 分页阶段耗时。 */
  lastPartitionDuration: number
  /** 位置列表阶段耗时。 */
  lastPositionDuration: number
  /** 表格快照阶段耗时。 */
  lastSnapshotDuration: number
  /** 区域与搜索 / 控件高亮阶段耗时。 */
  lastHighlightDuration: number
}

/** 布局流水线统计状态容器。 */
export class DrawLayoutPipelineStats {
  private computeCount = 0
  private lastDuration = 0
  private totalDuration = 0
  private maxDuration = 0
  private lastRowLayoutDuration = 0
  private lastPartitionDuration = 0
  private lastPositionDuration = 0
  private lastSnapshotDuration = 0
  private lastHighlightDuration = 0

  public recordRowLayout(duration: number) {
    this.lastRowLayoutDuration = duration
  }

  public recordPartition(duration: number) {
    this.lastPartitionDuration = duration
  }

  public recordPosition(duration: number) {
    this.lastPositionDuration = duration
  }

  public recordSnapshot(duration: number) {
    this.lastSnapshotDuration = duration
  }

  public recordHighlight(duration: number) {
    this.lastHighlightDuration = duration
  }

  public recordCompute(duration: number) {
    this.computeCount++
    this.lastDuration = duration
    this.totalDuration += duration
    this.maxDuration = Math.max(this.maxDuration, duration)
  }

  /** 获取布局流水线统计，用于排查整篇重算的耗时分布。 */
  public getStats(): IDrawLayoutPipelineStats {
    return {
      computeCount: this.computeCount,
      lastDuration: this.lastDuration,
      totalDuration: this.totalDuration,
      averageDuration: this.computeCount ? this.totalDuration / this.computeCount : 0,
      maxDuration: this.maxDuration,
      lastRowLayoutDuration: this.lastRowLayoutDuration,
      lastPartitionDuration: this.lastPartitionDuration,
      lastPositionDuration: this.lastPositionDuration,
      lastSnapshotDuration: this.lastSnapshotDuration,
      lastHighlightDuration: this.lastHighlightDuration
    }
  }

  /** 重置布局流水线统计，不影响当前布局结果。 */
  public reset() {
    this.computeCount = 0
    this.lastDuration = 0
    this.totalDuration = 0
    this.maxDuration = 0
    this.lastRowLayoutDuration = 0
    this.lastPartitionDuration = 0
    this.lastPositionDuration = 0
    this.lastSnapshotDuration = 0
    this.lastHighlightDuration = 0
  }
}
