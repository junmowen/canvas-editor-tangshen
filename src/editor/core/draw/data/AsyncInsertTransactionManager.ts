import { IElement, IInsertElementListOption } from '../../../interface/Element'

/** async插入batch插入选项，用于约束调用方可传入的可选配置。 */
export type IAsyncInsertBatchInsertOption = IInsertElementListOption & {
  /** 大批量粘贴后台批次只写数据，最后一批再统一完整 layout。 */
  isSilentBatch?: boolean
  /** 后台大粘贴事务 id，用于避免递归批次再次启动新事务。 */
  asyncInsertTransactionId?: number
}

/** async插入transaction契约，用于约束内部流程中传递的数据结构。 */
interface IAsyncInsertTransaction {
  /** 当前后台大粘贴事务 id，递增用于识别过期批次。 */
  id: number
  /** 待提交批次。 */
  batchList: IElement[][]
  /** 下一批待提交下标，避免每批复制剩余队列。 */
  nextBatchIndex: number
  /** 后台批次沿用的插入选项。 */
  insertOptions: IInsertElementListOption
  /** 当前事务是否需要在最后提交历史。 */
  isSubmitHistory: boolean
  /** 当前事务启动时间。 */
  startTime: number
  /** 原始输入体量估算。 */
  rawWeight: number
  /** 总批次数。 */
  totalBatchCount: number
  /** 已完成批次数。 */
  completedBatchCount: number
  /** 后台计时器。 */
  timer: number | null
  /** 事务状态。 */
  status: 'active' | 'flushing'
  /** 最近一次后台批次耗时。 */
  lastBatchDurationMs: number
  /** 当前事务最大单批耗时。 */
  maxBatchDurationMs: number
  /** 首批同步提交耗时。 */
  firstBatchDurationMs: number
}

/** async插入transactionstats契约，用于约束内部流程中传递的数据结构。 */
export interface IAsyncInsertTransactionStats {
  /** 当前是否存在后台大粘贴事务。 */
  active: boolean
  /** 当前事务 id。 */
  currentId: number
  /** 当前待处理批次数。 */
  pendingBatchCount: number
  /** 当前事务总批次数。 */
  totalBatchCount: number
  /** 当前事务已完成批次数。 */
  completedBatchCount: number
  /** 当前事务原始输入体量。 */
  rawWeight: number
  /** 当前事务已运行耗时。 */
  elapsedMs: number
  /** 历史启动次数。 */
  startedCount: number
  /** 历史完成次数。 */
  completedCount: number
  /** 历史取消次数。 */
  canceledCount: number
  /** 最近完成事务耗时。 */
  lastDurationMs: number
  /** 最近完成事务批次数。 */
  lastBatchCount: number
  /** 最近完成事务原始输入体量。 */
  lastRawWeight: number
  /** 单个事务最大批次数。 */
  maxBatchCount: number
  /** 单个事务最大原始输入体量。 */
  maxRawWeight: number
  /** 最近取消事务批次数。 */
  lastCanceledBatchCount: number
  /** 最近取消事务已完成批次数。 */
  lastCanceledCompletedBatchCount: number
  /** 最近取消事务原始输入体量。 */
  lastCanceledRawWeight: number
  /** 当前或最近事务状态。 */
  status: 'idle' | 'active' | 'flushing' | 'completed' | 'canceled' | 'failed'
  /** 最近一次完成原因。 */
  lastFinishReason: string | null
  /** 最近一次取消原因。 */
  lastCancelReason: string | null
  /** 最近一次 flush 原因。 */
  lastFlushReason: string | null
  /** 最近一次失败原因。 */
  lastErrorReason: string | null
  /** 最近事务首批同步耗时。 */
  lastFirstBatchDurationMs: number
  /** 当前事务首批同步耗时。 */
  currentFirstBatchDurationMs: number
  /** 最近事务后台批次总耗时。 */
  lastBackgroundBatchDurationMs: number
  /** 当前事务后台批次总耗时。 */
  currentBackgroundBatchDurationMs: number
  /** 最近事务最终 layout 耗时。 */
  lastFinalLayoutDurationMs: number
  /** 单个后台批次最大耗时。 */
  maxBatchDurationMs: number
  /** 最近事务最终页数。 */
  lastFinalPageCount: number
  /** 当前或最近事务最大单批耗时。 */
  currentMaxBatchDurationMs: number
  /** 大粘贴同步接管次数。 */
  syncRecoveryCount: number
  /** 最近一次大粘贴同步接管原因。 */
  lastSyncRecoveryReason: string | null
  /** 表格上下文大粘贴同步接管次数。 */
  tableSyncRecoveryCount: number
  /** 控件上下文大粘贴同步接管次数。 */
  controlSyncRecoveryCount: number
  /** 页眉上下文大粘贴同步接管次数。 */
  headerSyncRecoveryCount: number
  /** 页脚上下文大粘贴同步接管次数。 */
  footerSyncRecoveryCount: number
}

/** 大粘贴后台事务状态机，只负责批次推进、取消和统计。 */
export class AsyncInsertTransactionManager {
  /** 当前大批量插入后台事务。 */
  private transaction: IAsyncInsertTransaction | null = null
  /** 大批量插入事务统计。 */
  private stats: IAsyncInsertTransactionStats = this.createEmptyStats()
  /** 大批量插入事务 id 生成器。 */
  private transactionSeed = 0

  /** 初始化 AsyncInsertTransactionManager 实例并注入运行依赖。 */
  constructor(
    private readonly insertBatch: (
      batch: IElement[],
      options: IAsyncInsertBatchInsertOption
    ) => void,
    private readonly finishTransaction: (isSubmitHistory: boolean) => void
  ) {}

  /** 启动大批量插入后台事务。 */
  public start(payload: {
    batchList: IElement[][]
    /** 插入options，用于调整当前流程的可选行为。 */
    insertOptions: IInsertElementListOption
    /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
    isSubmitHistory: boolean
    /** rawweight数值，用于当前布局、统计或索引计算。 */
    rawWeight: number
    /** totalbatchcount，用于统计当前场景的发生次数。 */
    totalBatchCount: number
  }) {
    this.cancel('replaced-by-new-transaction')
    const transaction: IAsyncInsertTransaction = {
      id: ++this.transactionSeed,
      batchList: payload.batchList,
      nextBatchIndex: 0,
      insertOptions: payload.insertOptions,
      isSubmitHistory: payload.isSubmitHistory,
      startTime: performance.now(),
      rawWeight: payload.rawWeight,
      totalBatchCount: payload.totalBatchCount,
      completedBatchCount: 0,
      timer: null,
      status: 'active',
      lastBatchDurationMs: 0,
      maxBatchDurationMs: 0,
      firstBatchDurationMs: 0
    }
    this.transaction = transaction
    this.stats.startedCount++
    this.stats.currentId = transaction.id
    this.stats.status = 'active'
    this.stats.lastCancelReason = null
    this.stats.lastFinishReason = null
    this.stats.lastFlushReason = null
    this.stats.lastErrorReason = null
    this.stats.currentFirstBatchDurationMs = 0
    this.stats.currentBackgroundBatchDurationMs = 0
    this.stats.currentMaxBatchDurationMs = 0
    this.stats.maxBatchCount = Math.max(
      this.stats.maxBatchCount,
      transaction.totalBatchCount
    )
    this.stats.maxRawWeight = Math.max(
      this.stats.maxRawWeight,
      transaction.rawWeight
    )
    return transaction
  }

  /** 继续提交大批量插入后台事务。 */
  public schedule(transactionId: number) {
    const transaction = this.transaction
    if (!transaction || transaction.id !== transactionId) {
      return
    }
    if (transaction.nextBatchIndex >= transaction.batchList.length) {
      this.finish(transaction)
      return
    }
    if (transaction.timer !== null) {
      window.clearTimeout(transaction.timer)
    }
    transaction.timer = window.setTimeout(() => {
      transaction.timer = null
      if (transaction.id !== this.transaction?.id) {
        return
      }
      try {
        this.insertNextBatch(transaction)
        this.schedule(transaction.id)
      } catch (error) {
        this.fail(transaction, this.resolveErrorReason(error))
        throw error
      }
    }, 0)
  }

  /**
   * 同步收敛仍在后台推进的大粘贴事务。
   *
   * 保存、导出、打印、取值等读取型入口需要完整文档数据，不能读取到后台事务中间态。
   */
  public flush(reason = 'manual') {
    const transaction = this.transaction
    if (!transaction) {
      return false
    }
    transaction.status = 'flushing'
    this.stats.status = 'flushing'
    this.stats.lastFlushReason = reason
    if (transaction.timer !== null) {
      window.clearTimeout(transaction.timer)
      transaction.timer = null
    }
    while (
      transaction.id === this.transaction?.id &&
      transaction.nextBatchIndex < transaction.batchList.length
    ) {
      try {
        this.insertNextBatch(transaction)
      } catch (error) {
        this.fail(transaction, this.resolveErrorReason(error))
        throw error
      }
    }
    this.finish(transaction, 'flush')
    return true
  }

  /** 取消仍在后台推进的大批量插入事务。 */
  public cancel(reason = 'manual') {
    const transaction = this.transaction
    if (!transaction) {
      return
    }
    if (transaction.timer !== null) {
      window.clearTimeout(transaction.timer)
    }
    this.transaction = null
    this.stats.canceledCount++
    this.stats.status = 'canceled'
    this.stats.lastCancelReason = reason
    this.stats.lastCanceledBatchCount = transaction.totalBatchCount
    this.stats.lastCanceledCompletedBatchCount =
      transaction.completedBatchCount
    this.stats.lastCanceledRawWeight = transaction.rawWeight
  }

  /** 记录首批已经由调用方同步提交。 */
  public markFirstBatchCompleted(transactionId: number, durationMs = 0) {
    if (this.transaction?.id === transactionId) {
      this.transaction.completedBatchCount = 1
      this.transaction.firstBatchDurationMs = durationMs
      this.stats.currentFirstBatchDurationMs = durationMs
    }
  }

  /** 记录最终完整 layout 收敛耗时和页数。 */
  public recordFinalLayout(payload: { durationMs: number; pageCount: number }) {
    this.stats.lastFinalLayoutDurationMs = payload.durationMs
    this.stats.lastFinalPageCount = payload.pageCount
  }

  /** 记录大粘贴没有启动后台事务而走同步路径的原因。 */
  public recordSyncRecovery(reason: string) {
    this.stats.syncRecoveryCount++
    this.stats.lastSyncRecoveryReason = reason
    if (reason === 'table-context') {
      this.stats.tableSyncRecoveryCount++
    } else if (reason === 'control-context') {
      this.stats.controlSyncRecoveryCount++
    } else if (reason === 'header-context') {
      this.stats.headerSyncRecoveryCount++
    } else if (reason === 'footer-context') {
      this.stats.footerSyncRecoveryCount++
    }
  }

  /** 获取大批量插入事务统计。 */
  public getStats(): IAsyncInsertTransactionStats {
    const transaction = this.transaction
    return {
      ...this.stats,
      active: Boolean(transaction),
      currentId: transaction?.id ?? this.stats.currentId,
      pendingBatchCount: transaction
        ? transaction.batchList.length - transaction.nextBatchIndex
        : 0,
      totalBatchCount: transaction?.totalBatchCount ?? 0,
      completedBatchCount: transaction?.completedBatchCount ?? 0,
      rawWeight: transaction?.rawWeight ?? 0,
      elapsedMs: transaction ? performance.now() - transaction.startTime : 0,
      status: transaction?.status ?? this.stats.status,
      currentFirstBatchDurationMs:
        transaction?.firstBatchDurationMs ??
        this.stats.currentFirstBatchDurationMs,
      currentBackgroundBatchDurationMs: transaction
        ? this.stats.currentBackgroundBatchDurationMs
        : 0,
      currentMaxBatchDurationMs:
        transaction?.maxBatchDurationMs ?? this.stats.currentMaxBatchDurationMs
    }
  }

  /** 重置大批量插入事务统计，不取消当前事务。 */
  public resetStats() {
    const transaction = this.transaction
    this.stats = {
      ...this.createEmptyStats(),
      active: Boolean(transaction),
      currentId: transaction?.id ?? 0,
      pendingBatchCount: transaction
        ? transaction.batchList.length - transaction.nextBatchIndex
        : 0,
      totalBatchCount: transaction?.totalBatchCount ?? 0,
      completedBatchCount: transaction?.completedBatchCount ?? 0,
      rawWeight: transaction?.rawWeight ?? 0,
      maxBatchCount: transaction?.totalBatchCount ?? 0,
      maxRawWeight: transaction?.rawWeight ?? 0,
      status: transaction ? transaction.status : 'idle',
      currentFirstBatchDurationMs: transaction?.firstBatchDurationMs ?? 0,
      currentBackgroundBatchDurationMs: 0,
      currentMaxBatchDurationMs: transaction?.maxBatchDurationMs ?? 0
    }
  }

  /** 提交下一批后台元素。 */
  private insertNextBatch(transaction: IAsyncInsertTransaction) {
    const currentBatch = transaction.batchList[transaction.nextBatchIndex++]
    const startTime = performance.now()
    this.insertBatch(currentBatch, {
      ...transaction.insertOptions,
      isSubmitHistory: false,
      isSilentBatch: true,
      asyncInsertTransactionId: transaction.id
    })
    const duration = performance.now() - startTime
    transaction.lastBatchDurationMs = duration
    transaction.maxBatchDurationMs = Math.max(
      transaction.maxBatchDurationMs,
      duration
    )
    this.stats.currentBackgroundBatchDurationMs += duration
    this.stats.currentMaxBatchDurationMs = transaction.maxBatchDurationMs
    this.stats.maxBatchDurationMs = Math.max(
      this.stats.maxBatchDurationMs,
      duration
    )
    transaction.completedBatchCount++
  }

  /** 后台批次失败时收敛事务状态，避免过期 timer 继续写入文档。 */
  private fail(transaction: IAsyncInsertTransaction, reason: string) {
    if (transaction.id !== this.transaction?.id) {
      return
    }
    if (transaction.timer !== null) {
      window.clearTimeout(transaction.timer)
      transaction.timer = null
    }
    this.transaction = null
    this.stats.status = 'failed'
    this.stats.lastErrorReason = reason
    this.stats.lastDurationMs = performance.now() - transaction.startTime
    this.stats.lastBatchCount = transaction.totalBatchCount
    this.stats.lastRawWeight = transaction.rawWeight
    this.stats.lastFirstBatchDurationMs = transaction.firstBatchDurationMs
    this.stats.lastBackgroundBatchDurationMs =
      this.stats.currentBackgroundBatchDurationMs
    this.stats.currentFirstBatchDurationMs = 0
    this.stats.currentBackgroundBatchDurationMs = 0
    this.stats.currentMaxBatchDurationMs = 0
  }

  /** 完成大批量插入后台事务。 */
  private finish(transaction: IAsyncInsertTransaction, reason = 'completed') {
    if (transaction.id !== this.transaction?.id) {
      return
    }
    const backgroundBatchDuration = this.stats.currentBackgroundBatchDurationMs
    this.transaction = null
    this.stats.completedCount++
    this.stats.status = 'completed'
    this.stats.lastFinishReason = reason
    this.stats.lastDurationMs = performance.now() - transaction.startTime
    this.stats.lastBatchCount = transaction.totalBatchCount
    this.stats.lastRawWeight = transaction.rawWeight
    this.stats.lastFirstBatchDurationMs = transaction.firstBatchDurationMs
    this.stats.lastBackgroundBatchDurationMs = backgroundBatchDuration
    this.stats.currentFirstBatchDurationMs = 0
    this.stats.currentBackgroundBatchDurationMs = 0
    this.stats.currentMaxBatchDurationMs = 0
    try {
      this.finishTransaction(transaction.isSubmitHistory)
    } catch (error) {
      this.stats.status = 'failed'
      this.stats.lastErrorReason = this.resolveErrorReason(error)
      throw error
    }
  }

  /** 提取异常原因，供 stats 记录。 */
  private resolveErrorReason(error: unknown) {
    if (error instanceof Error && error.message) {
      return error.message
    }
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message
    ) {
      return error.message
    }
    if (typeof error === 'string' && error) {
      return error
    }
    return 'unknown'
  }

  /** 创建空统计对象。 */
  private createEmptyStats(): IAsyncInsertTransactionStats {
    return {
      active: false,
      currentId: 0,
      pendingBatchCount: 0,
      totalBatchCount: 0,
      completedBatchCount: 0,
      rawWeight: 0,
      elapsedMs: 0,
      startedCount: 0,
      completedCount: 0,
      canceledCount: 0,
      lastDurationMs: 0,
      lastBatchCount: 0,
      lastRawWeight: 0,
      maxBatchCount: 0,
      maxRawWeight: 0,
      lastCanceledBatchCount: 0,
      lastCanceledCompletedBatchCount: 0,
      lastCanceledRawWeight: 0,
      status: 'idle',
      lastFinishReason: null,
      lastCancelReason: null,
      lastFlushReason: null,
      lastErrorReason: null,
      lastFirstBatchDurationMs: 0,
      currentFirstBatchDurationMs: 0,
      lastBackgroundBatchDurationMs: 0,
      currentBackgroundBatchDurationMs: 0,
      lastFinalLayoutDurationMs: 0,
      maxBatchDurationMs: 0,
      lastFinalPageCount: 0,
      currentMaxBatchDurationMs: 0,
      syncRecoveryCount: 0,
      lastSyncRecoveryReason: null,
      tableSyncRecoveryCount: 0,
      controlSyncRecoveryCount: 0,
      headerSyncRecoveryCount: 0,
      footerSyncRecoveryCount: 0
    }
  }
}
