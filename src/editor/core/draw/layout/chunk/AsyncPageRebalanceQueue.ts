import { isChunkDebugEnabled, logChunkDebug } from './ChunkDebugLogger'

/** async页面rebalancequeuestats契约，用于约束内部流程中传递的数据结构。 */
export interface IAsyncPageRebalanceQueueStats {
  /** 异步传播调度次数。 */
  scheduleCount: number
  /** 异步队列历史最大待处理页数。 */
  maxPendingPageCount: number
  /** 当前仍在等待异步处理的页数。 */
  pendingPageCount: number
}

/** 页级 chunk 异步传播队列，负责去重、分批和定时刷新。 */
export class AsyncPageRebalanceQueue {
  /** 等待异步同步的“版本:页码”集合，去重并避免旧布局任务串到新文档。 */
  private readonly pendingPageNoSet = new Set<string>()
  /** 异步同步计时器。 */
  private asyncTimer: number | null = null
  /** 队列统计。 */
  private stats: IAsyncPageRebalanceQueueStats = {
    scheduleCount: 0,
    maxPendingPageCount: 0,
    pendingPageCount: 0
  }

  /** 初始化 AsyncPageRebalanceQueue 实例并注入运行依赖。 */
  constructor(
    private readonly getPageCount: () => number,
    private readonly flushPage: (pageNo: number) => void,
    private readonly getVersion: () => number,
    private readonly maxPageCountPerTick = 3
  ) {}

  /** 调度指定页参与异步传播。 */
  public schedule(pageNo: number) {
    if (pageNo < 0 || pageNo >= this.getPageCount()) {
      return
    }
    const previousSize = this.pendingPageNoSet.size
    const queueKey = this.createQueueKey(pageNo)
    this.pendingPageNoSet.add(queueKey)
    if (isChunkDebugEnabled()) {
      logChunkDebug('async-queue:schedule', {
        pageNo,
        queueKey,
        version: this.getVersion(),
        pendingKeys: Array.from(this.pendingPageNoSet)
      })
    }
    if (this.pendingPageNoSet.size !== previousSize) {
      this.stats.scheduleCount++
    }
    this.syncPendingStats()
    this.scheduleFlush()
  }

  /** 获取队列统计快照。 */
  public getStats(): IAsyncPageRebalanceQueueStats {
    return { ...this.stats }
  }

  /** 重置队列和统计。 */
  public reset() {
    this.clearPending()
    this.stats = {
      scheduleCount: 0,
      maxPendingPageCount: 0,
      pendingPageCount: 0
    }
  }

  /** 仅清空待处理任务，保留已有统计。 */
  public clearPending() {
    this.pendingPageNoSet.clear()
    if (this.asyncTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.asyncTimer)
    }
    this.asyncTimer = null
    this.syncPendingStats()
  }

  /** 执行一批异步页窗口同步，每轮限制数量，避免长文档一次性占满主线程。 */
  private flush() {
    const pageNoList = Array.from(this.pendingPageNoSet)
      .map(key => this.parseQueueKey(key))
      .filter(item => item.version === this.getVersion())
      .map(item => item.pageNo)
      .sort((a, b) => a - b)
    if (isChunkDebugEnabled()) {
      logChunkDebug('async-queue:flush', {
        version: this.getVersion(),
        pageNoList,
        pendingKeys: Array.from(this.pendingPageNoSet)
      })
    }
    this.pendingPageNoSet.clear()
    this.syncPendingStats()
    const currentBatch = pageNoList.slice(0, this.maxPageCountPerTick)
    const restBatch = pageNoList.slice(this.maxPageCountPerTick)
    restBatch.forEach(pageNo => this.pendingPageNoSet.add(this.createQueueKey(pageNo)))
    this.syncPendingStats()
    for (let i = 0; i < currentBatch.length; i++) {
      this.flushPage(currentBatch[i])
    }
    if (this.pendingPageNoSet.size) {
      this.scheduleFlush()
    }
  }

  /** 同步待处理数量统计。 */
  private syncPendingStats() {
    this.stats.pendingPageCount = this.pendingPageNoSet.size
    this.stats.maxPendingPageCount = Math.max(
      this.stats.maxPendingPageCount,
      this.pendingPageNoSet.size
    )
  }

  /** 启动下一轮 flush，不改写已入队任务的布局版本。 */
  private scheduleFlush() {
    if (this.asyncTimer !== null || typeof window === 'undefined') {
      return
    }
    this.asyncTimer = window.setTimeout(() => {
      this.asyncTimer = null
      this.flush()
    }, 0)
  }

  /** 创建带布局版本的队列键，避免旧异步任务作用到新文档。 */
  private createQueueKey(pageNo: number) {
    return `${this.getVersion()}:${pageNo}`
  }

  /** 解析队列键。 */
  private parseQueueKey(key: string) {
    const [version, pageNo] = key.split(':')
    return {
      version: Number(version),
      pageNo: Number(pageNo)
    }
  }
}
