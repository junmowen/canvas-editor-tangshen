import OffscreenRenderWorker from './offscreenRender.worker?worker&inline'
import { IRenderSurface } from '../types/RenderSurface'
import { IRenderTask } from '../types/RenderTask'
import { PageRenderSnapshotBuilder } from './PageRenderSnapshotBuilder'
import { WorkerBitmapCompositor } from './WorkerBitmapCompositor'
import {
  IWorkerPageRenderSnapshot,
  IWorkerRenderResult
} from './WorkerRenderProtocol'

/** worker 调度统计。 */
export interface IWorkerRenderSchedulerStats {
  submitCount: number
  successCount: number
  fallbackCount: number
  staleDiscardCount: number
  composeRejectCount: number
  timeoutCount: number
  cancelCount: number
  queueDropCount: number
  priorityReorderCount: number
  circuitOpenCount: number
  lastFallbackReason: string
  pendingCount: number
  activeCount: number
  queuedCount: number
  maxConcurrent: number
  maxQueueLength: number
  consecutiveFailureCount: number
  circuitOpen: boolean
}

/** worker 调度器调试配置；用于专项压测和浏览器回归注入边界条件。 */
export interface IWorkerRenderSchedulerDebugOptions {
  timeoutMs?: number
  maxQueueLength?: number
  circuitBreakerFailureThreshold?: number
}

/** 单个 worker job 状态。 */
interface IWorkerRenderJob {
  jobId: number
  surface: IRenderSurface
  task: IRenderTask
  snapshot: IWorkerPageRenderSnapshot
  timerId?: number
  sequence: number
}

/** OffscreenCanvas worker 调度器。 */
export class WorkerRenderScheduler {
  private worker: Worker | null = null
  private nextJobId = 1
  private readonly pendingJobMap = new Map<number, IWorkerRenderJob>()
  private readonly activeJobMap = new Map<number, IWorkerRenderJob>()
  private readonly queuedJobList: IWorkerRenderJob[] = []
  private readonly latestJobIdByPageNo = new Map<number, number>()
  private readonly compositor = new WorkerBitmapCompositor()
  private submitCount = 0
  private successCount = 0
  private fallbackCount = 0
  private staleDiscardCount = 0
  private composeRejectCount = 0
  private timeoutCount = 0
  private cancelCount = 0
  private queueDropCount = 0
  private priorityReorderCount = 0
  private circuitOpenCount = 0
  private consecutiveFailureCount = 0
  private circuitOpen = false
  private lastFallbackReason = ''
  private timeoutMs = 1500
  private readonly maxConcurrent = 1
  private maxQueueLength = 8
  private circuitBreakerFailureThreshold = 3
  private visiblePageNoList: number[] = []
  private scrollAnchorPageNo = 0
  private scrollDirection: -1 | 0 | 1 = 0

  constructor(private readonly snapshotBuilder: PageRenderSnapshotBuilder) {}

  /** 当前 worker 是否已经熔断。 */
  public isCircuitOpen(): boolean {
    return this.circuitOpen
  }

  /** 调整 worker 调度边界，用于测试超时、队列丢弃和熔断 fallback。 */
  public configureDebugOptions(options: IWorkerRenderSchedulerDebugOptions) {
    if (options.timeoutMs !== undefined) {
      this.timeoutMs = Math.max(0, options.timeoutMs)
    }
    if (options.maxQueueLength !== undefined) {
      this.maxQueueLength = Math.max(0, Math.floor(options.maxQueueLength))
      this.pruneQueuedJobs()
    }
    if (options.circuitBreakerFailureThreshold !== undefined) {
      this.circuitBreakerFailureThreshold = Math.max(
        1,
        Math.floor(options.circuitBreakerFailureThreshold)
      )
    }
  }

  /** 提交 worker 渲染任务；快照构建失败会向上抛出并交给 Canvas2D fallback。 */
  public submit(surface: IRenderSurface, task: IRenderTask) {
    if (this.circuitOpen) {
      throw new Error('OffscreenCanvas worker circuit breaker open')
    }
    const pagePayload = task.pagePayload
    if (!pagePayload) {
      throw new Error('worker render task missing page payload')
    }
    const jobId = this.nextJobId++
    const snapshot = this.snapshotBuilder.build({
      jobId,
      pagePayload
    })
    this.submitCount++
    this.cancelQueuedPageJobs(surface.pageNo, 'newer worker job queued')
    this.cancelActivePageJobs(surface.pageNo, 'newer worker job activated')
    const job: IWorkerRenderJob = {
      jobId,
      surface,
      task,
      snapshot,
      sequence: jobId
    }
    this.pendingJobMap.set(jobId, job)
    this.latestJobIdByPageNo.set(surface.pageNo, jobId)
    this.queuedJobList.push(job)
    this.prioritizeQueuedJobs()
    this.pruneQueuedJobs()
    this.pumpQueue()
  }

  /** 同步当前视口信息，用于 worker 队列按滚动方向优先消费。 */
  public updateViewport(payload: {
    visiblePageNoList?: number[]
    intersectionPageNo?: number
  }) {
    if (payload.visiblePageNoList) {
      this.visiblePageNoList = [...payload.visiblePageNoList]
    }
    if (payload.intersectionPageNo === undefined) return
    const nextAnchor = payload.intersectionPageNo
    const nextDirection =
      nextAnchor > this.scrollAnchorPageNo
        ? 1
        : nextAnchor < this.scrollAnchorPageNo
        ? -1
        : this.scrollDirection
    this.scrollAnchorPageNo = nextAnchor
    this.scrollDirection = nextDirection
    this.prioritizeQueuedJobs()
  }

  /** 取消指定页待处理 worker job；通常用于该页重新进入同步交互渲染路径。 */
  public cancelPage(pageNo: number, reason = 'worker render canceled') {
    let canceled = 0
    for (let i = this.queuedJobList.length - 1; i >= 0; i--) {
      const job = this.queuedJobList[i]
      if (job.surface.pageNo !== pageNo) continue
      this.removeJob(job)
      canceled++
    }
    this.activeJobMap.forEach(job => {
      if (job.surface.pageNo !== pageNo) return
      this.removeJob(job)
      canceled++
    })
    if (this.latestJobIdByPageNo.has(pageNo)) {
      this.latestJobIdByPageNo.delete(pageNo)
    }
    if (canceled) {
      this.cancelCount += canceled
      this.lastFallbackReason = reason
      this.pumpQueue()
    }
  }

  /** 获取 worker 调度统计。 */
  public getStats(): IWorkerRenderSchedulerStats {
    return {
      submitCount: this.submitCount,
      successCount: this.successCount,
      fallbackCount: this.fallbackCount,
      staleDiscardCount: this.staleDiscardCount,
      composeRejectCount: this.composeRejectCount,
      timeoutCount: this.timeoutCount,
      cancelCount: this.cancelCount,
      queueDropCount: this.queueDropCount,
      priorityReorderCount: this.priorityReorderCount,
      circuitOpenCount: this.circuitOpenCount,
      lastFallbackReason: this.lastFallbackReason,
      pendingCount: this.pendingJobMap.size,
      activeCount: this.activeJobMap.size,
      queuedCount: this.queuedJobList.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueLength: this.maxQueueLength,
      consecutiveFailureCount: this.consecutiveFailureCount,
      circuitOpen: this.circuitOpen
    }
  }

  /** 重置统计，不终止 worker。 */
  public resetStats() {
    this.submitCount = 0
    this.successCount = 0
    this.fallbackCount = 0
    this.staleDiscardCount = 0
    this.composeRejectCount = 0
    this.timeoutCount = 0
    this.cancelCount = 0
    this.queueDropCount = 0
    this.priorityReorderCount = 0
    this.circuitOpenCount = 0
    this.consecutiveFailureCount = this.circuitOpen
      ? this.circuitBreakerFailureThreshold
      : 0
    this.lastFallbackReason = ''
  }

  /** 终止 worker 并清理 pending job。 */
  public dispose() {
    this.pendingJobMap.forEach(job => {
      this.clearJobTimer(job)
    })
    this.pendingJobMap.clear()
    this.activeJobMap.clear()
    this.queuedJobList.length = 0
    this.latestJobIdByPageNo.clear()
    this.worker?.terminate()
    this.worker = null
  }

  /** 懒创建 worker 实例。 */
  private ensureWorker() {
    if (this.worker) return
    this.worker = new OffscreenRenderWorker()
    this.worker.onmessage = evt => {
      this.handleWorkerResult(evt.data as IWorkerRenderResult)
    }
    this.worker.onerror = evt => {
      const reason = evt.message || 'worker error'
      this.lastFallbackReason = reason
      this.drainPendingJobsToFallback(reason)
      this.recordWorkerFailure(reason)
      this.worker?.terminate()
      this.worker = null
    }
  }

  /** 处理 worker 返回。 */
  private handleWorkerResult(result: IWorkerRenderResult) {
    const job = this.pendingJobMap.get(result.jobId)
    if (!job) {
      if (result.type === 'success') {
        result.bitmap.close()
      }
      this.staleDiscardCount++
      return
    }
    this.activeJobMap.delete(result.jobId)
    this.clearJobTimer(job)
    if (this.latestJobIdByPageNo.get(job.surface.pageNo) !== result.jobId) {
      this.pendingJobMap.delete(result.jobId)
      if (result.type === 'success') {
        result.bitmap.close()
      }
      this.staleDiscardCount++
      this.pumpQueue()
      return
    }
    if (result.type === 'error') {
      this.fallbackJob(job.jobId, result.errorReason, job)
      return
    }
    const composeResult = this.compositor.compose(job.surface, result, {
      layoutVersion: this.snapshotBuilder.getLayoutVersion(),
      baseVisualVersion: this.snapshotBuilder.getBaseVisualVersion()
    })
    if (!composeResult.composed) {
      this.composeRejectCount++
      this.fallbackJob(
        job.jobId,
        composeResult.rejectReason || 'worker bitmap compose rejected',
        job
      )
      return
    }
    this.pendingJobMap.delete(result.jobId)
    this.latestJobIdByPageNo.delete(job.surface.pageNo)
    this.successCount++
    this.consecutiveFailureCount = 0
    this.cacheComposedSurface(job.surface, result)
    this.pumpQueue()
  }

  /** worker 超时后回退 Canvas2D。 */
  private handleTimeout(jobId: number) {
    this.timeoutCount++
    this.fallbackJob(jobId, 'worker render timeout')
  }

  /** 回退执行原 Canvas2D 绘制回调。 */
  private fallbackJob(jobId: number, reason: string, knownJob?: IWorkerRenderJob) {
    const job = knownJob || this.pendingJobMap.get(jobId)
    if (!job) return
    this.removeJob(job)
    this.fallbackCount++
    this.lastFallbackReason = reason
    this.recordWorkerFailure(reason)
    job.task.execute?.(job.surface, job.task)
    this.pumpQueue()
  }

  /** 调度队列，按并发上限向 worker 投递任务。 */
  private pumpQueue() {
    if (this.circuitOpen || !this.queuedJobList.length) return
    this.ensureWorker()
    while (
      this.activeJobMap.size < this.maxConcurrent &&
      this.queuedJobList.length
    ) {
      this.prioritizeQueuedJobs()
      const job = this.queuedJobList.shift()!
      if (this.latestJobIdByPageNo.get(job.surface.pageNo) !== job.jobId) {
        this.pendingJobMap.delete(job.jobId)
        this.staleDiscardCount++
        continue
      }
      this.startJob(job)
    }
  }

  /** 投递单个 job 到 worker。 */
  private startJob(job: IWorkerRenderJob) {
    try {
      job.timerId = window.setTimeout(() => {
        this.handleTimeout(job.jobId)
      }, this.timeoutMs)
      this.activeJobMap.set(job.jobId, job)
      this.worker!.postMessage(job.snapshot)
    } catch (error) {
      this.fallbackJob(job.jobId, this.resolveErrorReason(error), job)
    }
  }

  /** 同页只保留最新排队 job。 */
  private cancelQueuedPageJobs(pageNo: number, reason: string) {
    let canceled = 0
    for (let i = this.queuedJobList.length - 1; i >= 0; i--) {
      const job = this.queuedJobList[i]
      if (job.surface.pageNo !== pageNo) continue
      this.removeJob(job)
      canceled++
    }
    if (canceled) {
      this.cancelCount += canceled
      this.lastFallbackReason = reason
    }
  }

  /** 同页新任务到来时主动终止旧 active job，确保旧 bitmap 不会继续占用 worker。 */
  private cancelActivePageJobs(pageNo: number, reason: string) {
    let canceled = 0
    this.activeJobMap.forEach(job => {
      if (job.surface.pageNo !== pageNo) return
      this.removeJob(job)
      canceled++
    })
    if (!canceled) return
    this.worker?.terminate()
    this.worker = null
    this.cancelCount += canceled
    this.lastFallbackReason = reason
  }

  /** 队列超限时丢弃最旧排队 job，并立即回退 Canvas2D，避免页面空白。 */
  private pruneQueuedJobs() {
    while (this.queuedJobList.length > this.maxQueueLength) {
      const job = this.queuedJobList[0]
      this.queueDropCount++
      this.fallbackJob(job.jobId, 'worker queue limit exceeded', job)
    }
  }

  /** 根据当前可视页和滚动方向重排 worker 队列。 */
  private prioritizeQueuedJobs() {
    if (this.queuedJobList.length <= 1) return
    const before = this.queuedJobList.map(job => job.jobId).join(',')
    this.queuedJobList.sort((a, b) => {
      const priorityDelta =
        this.getJobPriorityScore(a) - this.getJobPriorityScore(b)
      if (priorityDelta) return priorityDelta
      return a.sequence - b.sequence
    })
    const after = this.queuedJobList.map(job => job.jobId).join(',')
    if (before !== after) {
      this.priorityReorderCount++
    }
  }

  /** 数值越小优先级越高。 */
  private getJobPriorityScore(job: IWorkerRenderJob): number {
    const pageNo = job.surface.pageNo
    const visibleIndex = this.visiblePageNoList.indexOf(pageNo)
    const isVisible = visibleIndex >= 0
    const anchor = this.scrollAnchorPageNo
    const direction = this.scrollDirection
    const distance = Math.abs(pageNo - anchor)
    let directionPenalty = 2
    if (!direction) {
      directionPenalty = 1
    } else if (
      (direction > 0 && pageNo >= anchor) ||
      (direction < 0 && pageNo <= anchor)
    ) {
      directionPenalty = 0
    }
    const visiblePenalty = isVisible ? 0 : 1
    const visibleOrder =
      direction < 0 && isVisible
        ? this.visiblePageNoList.length - 1 - visibleIndex
        : isVisible
        ? visibleIndex
        : this.visiblePageNoList.length
    return (
      visiblePenalty * 100000 +
      directionPenalty * 10000 +
      distance * 100 +
      visibleOrder
    )
  }

  /** 移除 job 的所有 pending / active / queued 状态。 */
  private removeJob(job: IWorkerRenderJob) {
    this.pendingJobMap.delete(job.jobId)
    this.activeJobMap.delete(job.jobId)
    this.removeQueuedJob(job.jobId)
    this.clearJobTimer(job)
    if (this.latestJobIdByPageNo.get(job.surface.pageNo) === job.jobId) {
      this.latestJobIdByPageNo.delete(job.surface.pageNo)
    }
  }

  /** 从排队列表移除指定 job。 */
  private removeQueuedJob(jobId: number) {
    const index = this.queuedJobList.findIndex(job => job.jobId === jobId)
    if (index >= 0) {
      this.queuedJobList.splice(index, 1)
    }
  }

  /** 清理 job 超时定时器。 */
  private clearJobTimer(job: IWorkerRenderJob) {
    if (job.timerId !== undefined) {
      window.clearTimeout(job.timerId)
      job.timerId = undefined
    }
  }

  /** 记录 worker 失败并在连续失败后熔断。 */
  private recordWorkerFailure(reason: string) {
    this.consecutiveFailureCount++
    if (
      !this.circuitOpen &&
      this.consecutiveFailureCount >= this.circuitBreakerFailureThreshold
    ) {
      this.circuitOpen = true
      this.circuitOpenCount++
      this.lastFallbackReason = `worker circuit breaker open: ${reason}`
      this.drainPendingJobsToFallback(this.lastFallbackReason)
    }
  }

  /** 将所有待处理 job 回退到 Canvas2D。 */
  private drainPendingJobsToFallback(reason: string) {
    const jobList = Array.from(this.pendingJobMap.values())
    jobList.forEach(job => {
      this.removeJob(job)
      this.fallbackCount++
      this.lastFallbackReason = reason
      job.task.execute?.(job.surface, job.task)
    })
  }

  /** 解析异常原因。 */
  private resolveErrorReason(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  /** 合成成功后写入 bitmap cache。 */
  private cacheComposedSurface(
    surface: IRenderSurface,
    result: Extract<IWorkerRenderResult, { type: 'success' }>
  ) {
    const bitmap = result.bitmap
    createImageBitmap(bitmap)
      .then(cacheBitmap => {
        this.snapshotBuilder.cacheWorkerBitmap(
          surface,
          cacheBitmap,
          result.layoutVersion * 100000 + result.baseVisualVersion
        )
      })
      .catch(() => {
        // bitmap cache 是性能优化路径，失败不影响已合成页面。
      })
      .finally(() => {
        bitmap.close()
      })
    this.snapshotBuilder
      .getDraw()
      .getServices()
      .pageRenderer.recordBaseRenderSource('worker-render', surface.pageNo)
  }
}
