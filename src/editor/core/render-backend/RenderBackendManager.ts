import { IRenderBackend } from './types/RenderBackend'
import { IRenderSurface } from './types/RenderSurface'
import { IRenderTask, RenderTaskPriority, RenderTaskReason } from './types/RenderTask'
import { RenderLayer } from './types/RenderLayer'

/** 渲染backendcapability契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderBackendCapability {
  /** 渲染后端名称。 */
  name: string
  /** 当前环境是否支持该后端能力。 */
  supported?: boolean
  /** 当前是否启用该后端处理任务。 */
  enabled?: boolean
  /** 索引签名，描述动态键值的访问结构。 */
  [key: string]: unknown
}

/** 渲染backenddurationstats契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderBackendDurationStats {
  /** 后端累计渲染次数。 */
  count: number
  /** 后端累计渲染耗时，单位毫秒。 */
  totalDuration: number
  /** 后端平均渲染耗时，单位毫秒。 */
  averageDuration: number
  /** 后端最大单次渲染耗时，单位毫秒。 */
  maxDuration: number
}

/** 渲染backendfailurerecord契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderBackendFailureRecord {
  /** 失败的后端名称。 */
  backendName: string
  /** 失败原因。 */
  errorReason: string
  /** 该后端本次尝试耗时，单位毫秒。 */
  duration: number
}

/** 渲染backendrecentsample契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderBackendRecentSample {
  /** 任务所属页码。 */
  pageNo: number
  /** 任务渲染层。 */
  layer: RenderLayer
  /** 任务触发原因。 */
  reason: RenderTaskReason
  /** 任务优先级。 */
  priority: RenderTaskPriority
  /** 是否成功命中后端并完成渲染。 */
  rendered: boolean
  /** 命中的后端名称，未命中时为空。 */
  backendName?: string
  /** 本次调度是否从失败后端切换到后续后端。 */
  failover: boolean
  /** 本次调度中失败的后端名称列表。 */
  failedBackendNameList: string[]
  /** 本次调度耗时，单位毫秒。 */
  duration: number
  /** 样本记录时间，使用 performance.now() 的时间基准。 */
  timestamp: number
}

/** 渲染backend页面enginestats契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderBackendPageEngineStats {
  /** 任务所属页码。 */
  pageNo: number
  /** 任务渲染层。 */
  layer: RenderLayer
  /** 最近一次任务触发原因。 */
  lastReason: RenderTaskReason
  /** 最近一次任务优先级。 */
  lastPriority: RenderTaskPriority
  /** 最近一次是否成功命中后端。 */
  lastRendered: boolean
  /** 最近一次命中的后端名称，未命中时为空。 */
  lastBackendName?: string
  /** 最近一次是否发生引擎降级路径切换。 */
  lastFailover: boolean
  /** 最近一次失败的后端名称列表。 */
  lastFailedBackendNameList: string[]
  /** 最近一次调度耗时，单位毫秒。 */
  lastDuration: number
  /** 最近一次调度时间，使用 performance.now() 的时间基准。 */
  lastTimestamp: number
  /** 该页该层累计成功渲染次数。 */
  renderCount: number
  /** 该页该层累计未命中次数。 */
  missCount: number
  /** 该页该层累计后端失败尝试次数。 */
  failureCount: number
  /** 该页该层累计降级路径次数。 */
  failoverCount: number
}

/** 渲染taskstats契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderTaskStats {
  /** 按 layer 分组的调度次数。 */
  dispatchCountByLayer: Partial<Record<RenderLayer, number>>
  /** 按 reason 分组的调度次数。 */
  dispatchCountByReason: Partial<Record<RenderTaskReason, number>>
  /** 按 priority 分组的调度次数。 */
  dispatchCountByPriority: Partial<Record<RenderTaskPriority, number>>
  /** 按 layer 分组的成功渲染次数。 */
  renderCountByLayer: Partial<Record<RenderLayer, number>>
  /** 按 reason 分组的成功渲染次数。 */
  renderCountByReason: Partial<Record<RenderTaskReason, number>>
  /** 按 priority 分组的成功渲染次数。 */
  renderCountByPriority: Partial<Record<RenderTaskPriority, number>>
}

/** 渲染backendrecent窗口stats契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderBackendRecentWindowStats {
  /** 近期窗口最多保留的样本数。 */
  windowSize: number
  /** 当前窗口内样本数。 */
  sampleCount: number
  /** 当前窗口内成功渲染次数。 */
  renderCount: number
  /** 当前窗口内未命中后端次数。 */
  missCount: number
  /** 当前窗口内后端失败尝试次数。 */
  failureCount: number
  /** 当前窗口内降级路径次数。 */
  failoverCount: number
  /** 当前窗口内各后端失败次数。 */
  backendFailureCountMap: Record<string, number>
  /** 当前窗口内各后端作为降级目标的次数。 */
  backendFailoverCountMap: Record<string, number>
  /** 当前窗口内慢任务数量。 */
  slowCount: number
  /** 慢任务阈值，单位毫秒。 */
  slowThreshold: number
  /** 当前窗口内平均调度耗时，单位毫秒。 */
  averageDuration: number
  /** 当前窗口内最大调度耗时，单位毫秒。 */
  maxDuration: number
  /** 当前窗口内各后端耗时统计。 */
  backendDurationStatsMap: Record<string, IRenderBackendDurationStats>
  /** 当前窗口内任务维度统计。 */
  taskStats: IRenderTaskStats
}

export interface IRenderBackendDispatchResult {
  /** 是否找到并执行了可用后端。 */
  rendered: boolean
  /** 命中的后端名称，未命中时为空。 */
  backendName?: string
  /** 本次调度是否从失败后端切换到后续后端。 */
  failover: boolean
  /** 本次调度中失败的后端列表。 */
  failedBackendList: IRenderBackendFailureRecord[]
  /** 本次调度耗时，单位毫秒。 */
  duration: number
  /** 未命中后端时的原因描述。 */
  reason?: string
}

/** 渲染backendmanagerstats契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderBackendManagerStats {
  /** 累计调度次数。 */
  dispatchCount: number
  /** 累计成功渲染次数。 */
  renderCount: number
  /** 累计未命中后端次数。 */
  missCount: number
  /** 累计后端失败尝试次数。 */
  failureCount: number
  /** 累计降级路径次数。 */
  failoverCount: number
  /** 各后端命中次数。 */
  backendHitCountMap: Record<string, number>
  /** 各后端失败次数。 */
  backendFailureCountMap: Record<string, number>
  /** 各后端作为降级目标的次数。 */
  backendFailoverCountMap: Record<string, number>
  /** 各后端耗时统计。 */
  backendDurationStatsMap: Record<string, IRenderBackendDurationStats>
  /** 最近一次调度结果。 */
  lastResult?: IRenderBackendDispatchResult
  /** 已注册后端的能力状态列表。 */
  capabilityList: IRenderBackendCapability[]
  /** 渲染任务维度统计。 */
  taskStats: IRenderTaskStats
  /** 最近一段渲染调度窗口统计。 */
  recentWindow: IRenderBackendRecentWindowStats
  /** 每页每层最近一次命中的渲染引擎状态。 */
  pageEngineStatsList: IRenderBackendPageEngineStats[]
}

/** 渲染后端管理器，负责按任务选择合适的渲染引擎。 */
export class RenderBackendManager {
  /** 已注册的渲染后端列表，按注册顺序作为备用路径顺序。 */
  private readonly backendList: IRenderBackend[]
  /** 累计调度次数。 */
  private dispatchCount = 0
  /** 累计成功渲染次数。 */
  private renderCount = 0
  /** 累计未命中后端次数。 */
  private missCount = 0
  /** 累计后端失败尝试次数。 */
  private failureCount = 0
  /** 累计降级路径次数。 */
  private failoverCount = 0
  /** 各后端命中次数。 */
  private readonly backendHitCountMap: Record<string, number> = {}
  /** 各后端失败次数。 */
  private readonly backendFailureCountMap: Record<string, number> = {}
  /** 各后端作为降级目标的次数。 */
  private readonly backendFailoverCountMap: Record<string, number> = {}
  /** 各后端累计渲染耗时。 */
  private readonly backendTotalDurationMap: Record<string, number> = {}
  /** 各后端最大单次渲染耗时。 */
  private readonly backendMaxDurationMap: Record<string, number> = {}
  /** 按 layer 分组的调度次数。 */
  private readonly dispatchCountByLayer: Partial<Record<RenderLayer, number>> = {}
  /** 按 reason 分组的调度次数。 */
  private readonly dispatchCountByReason: Partial<Record<RenderTaskReason, number>> = {}
  /** 按 priority 分组的调度次数。 */
  private readonly dispatchCountByPriority: Partial<
    Record<RenderTaskPriority, number>
  > = {}
  /** 按 layer 分组的成功渲染次数。 */
  private readonly renderCountByLayer: Partial<Record<RenderLayer, number>> = {}
  /** 按 reason 分组的成功渲染次数。 */
  private readonly renderCountByReason: Partial<Record<RenderTaskReason, number>> = {}
  /** 按 priority 分组的成功渲染次数。 */
  private readonly renderCountByPriority: Partial<
    Record<RenderTaskPriority, number>
  > = {}
  /** 最近一次调度结果。 */
  private lastResult?: IRenderBackendDispatchResult
  /** 近期调度窗口样本，用于避免历史平均值掩盖当前卡顿。 */
  private readonly recentSampleList: IRenderBackendRecentSample[] = []
  /** 近期调度窗口最大样本数。 */
  private readonly recentWindowSize = 120
  /** 慢任务阈值，超过一帧预算时计入 slowCount。 */
  private readonly slowTaskThreshold = 16.7
  /** 单页单层最近一次渲染引擎状态，用于测试时定位某页当前走的 engine。 */
  private readonly pageEngineStatsMap = new Map<
    string,
    IRenderBackendPageEngineStats
  >()

  /** 创建后端管理器，可注入默认后端列表。 */
  constructor(backendList: IRenderBackend[] = []) {
    this.backendList = backendList
  }

  /** 注册新的渲染后端。 */
  public register(
    backend: IRenderBackend,
    options: { priority?: 'first' | 'last' } = {}
  ) {
    if (options.priority === 'first') {
      this.backendList.unshift(backend)
      return
    }
    this.backendList.push(backend)
  }

  /** 选择可处理任务的后端并执行渲染，失败时按注册顺序回退到后续后端。 */
  public render(
    surface: IRenderSurface,
    task: IRenderTask
  ): IRenderBackendDispatchResult {
    const startTime = performance.now()
    this.dispatchCount++
    this.recordTaskDispatch(task)
    let matchedBackendCount = 0
    const failedBackendList: IRenderBackendFailureRecord[] = []

    for (const backend of this.backendList) {
      if (!backend.canRender(task)) {
        continue
      }
      matchedBackendCount++
      const backendStartTime = performance.now()
      try {
        backend.render(surface, task)
        const duration = performance.now() - startTime
        const failover = failedBackendList.length > 0
        this.renderCount++
        this.recordTaskRender(task)
        this.backendHitCountMap[backend.name] =
          (this.backendHitCountMap[backend.name] ?? 0) + 1
        if (failover) {
          this.failoverCount++
          this.backendFailoverCountMap[backend.name] =
            (this.backendFailoverCountMap[backend.name] ?? 0) + 1
        }
        this.recordBackendDuration(backend.name, duration)
        this.lastResult = {
          rendered: true,
          backendName: backend.name,
          failover,
          failedBackendList: failedBackendList.map(item => ({ ...item })),
          duration
        }
        this.recordRecentSample(task, this.lastResult)
        this.recordPageEngineStats(task, this.lastResult)
        return this.lastResult
      } catch (error) {
        const failureRecord = {
          backendName: backend.name,
          errorReason: this.resolveErrorReason(error),
          duration: performance.now() - backendStartTime
        }
        failedBackendList.push(failureRecord)
        this.failureCount++
        this.backendFailureCountMap[backend.name] =
          (this.backendFailureCountMap[backend.name] ?? 0) + 1
      }
    }

    this.missCount++
    this.lastResult = {
      rendered: false,
      failover: false,
      failedBackendList: failedBackendList.map(item => ({ ...item })),
      duration: performance.now() - startTime,
      reason: matchedBackendCount
        ? `All render backends failed layer=${task.layer}, reason=${task.reason}`
        : `No render backend matched layer=${task.layer}, reason=${task.reason}`
    }
    this.recordRecentSample(task, this.lastResult)
    this.recordPageEngineStats(task, this.lastResult)
    const lastFailure = failedBackendList[failedBackendList.length - 1]
    if (lastFailure) {
      throw new Error(lastFailure.errorReason)
    }
    return this.lastResult
  }

  /** 获取渲染后端调度统计信息。 */
  public getStats(): IRenderBackendManagerStats {
    return {
      dispatchCount: this.dispatchCount,
      renderCount: this.renderCount,
      missCount: this.missCount,
      failureCount: this.failureCount,
      failoverCount: this.failoverCount,
      backendHitCountMap: { ...this.backendHitCountMap },
      backendFailureCountMap: { ...this.backendFailureCountMap },
      backendFailoverCountMap: { ...this.backendFailoverCountMap },
      backendDurationStatsMap: this.getBackendDurationStatsMap(),
      lastResult: this.cloneDispatchResult(this.lastResult),
      capabilityList: this.getCapabilityList(),
      taskStats: this.getTaskStats(),
      recentWindow: this.getRecentWindowStats(),
      pageEngineStatsList: this.getPageEngineStatsList()
    }
  }

  /** 重置渲染调度统计，不影响已注册后端和实际渲染行为。 */
  public resetStats() {
    this.dispatchCount = 0
    this.renderCount = 0
    this.missCount = 0
    this.failureCount = 0
    this.failoverCount = 0
    this.lastResult = undefined
    this.recentSampleList.length = 0
    this.pageEngineStatsMap.clear()
    this.clearRecord(this.backendHitCountMap)
    this.clearRecord(this.backendFailureCountMap)
    this.clearRecord(this.backendFailoverCountMap)
    this.clearRecord(this.backendTotalDurationMap)
    this.clearRecord(this.backendMaxDurationMap)
    this.clearRecord(this.dispatchCountByLayer)
    this.clearRecord(this.dispatchCountByReason)
    this.clearRecord(this.dispatchCountByPriority)
    this.clearRecord(this.renderCountByLayer)
    this.clearRecord(this.renderCountByReason)
    this.clearRecord(this.renderCountByPriority)
  }

  /** 记录任务调度维度统计。 */
  private recordTaskDispatch(task: IRenderTask) {
    this.increaseCount(this.dispatchCountByLayer, task.layer)
    this.increaseCount(this.dispatchCountByReason, task.reason)
    this.increaseCount(this.dispatchCountByPriority, task.priority)
  }

  /** 记录任务成功渲染维度统计。 */
  private recordTaskRender(task: IRenderTask) {
    this.increaseCount(this.renderCountByLayer, task.layer)
    this.increaseCount(this.renderCountByReason, task.reason)
    this.increaseCount(this.renderCountByPriority, task.priority)
  }

  /** 递增指定统计表的计数。 */
  private increaseCount<T extends string>(
    map: Partial<Record<T, number>>,
    key: T
  ) {
    map[key] = (map[key] ?? 0) + 1
  }

  /** 获取渲染任务维度统计。 */
  private getTaskStats(): IRenderTaskStats {
    return {
      dispatchCountByLayer: { ...this.dispatchCountByLayer },
      dispatchCountByReason: { ...this.dispatchCountByReason },
      dispatchCountByPriority: { ...this.dispatchCountByPriority },
      renderCountByLayer: { ...this.renderCountByLayer },
      renderCountByReason: { ...this.renderCountByReason },
      renderCountByPriority: { ...this.renderCountByPriority }
    }
  }

  /** 记录单个后端本次渲染耗时。 */
  private recordBackendDuration(backendName: string, duration: number) {
    this.backendTotalDurationMap[backendName] =
      (this.backendTotalDurationMap[backendName] ?? 0) + duration
    this.backendMaxDurationMap[backendName] = Math.max(
      this.backendMaxDurationMap[backendName] ?? 0,
      duration
    )
  }

  /** 记录近期调度样本，并保持固定窗口长度。 */
  private recordRecentSample(
    task: IRenderTask,
    result: IRenderBackendDispatchResult
  ): void {
    this.recentSampleList.push({
      pageNo: task.pageNo,
      layer: task.layer,
      reason: task.reason,
      priority: task.priority,
      rendered: result.rendered,
      backendName: result.backendName,
      failover: result.failover,
      failedBackendNameList: result.failedBackendList.map(item => {
        return item.backendName
      }),
      duration: result.duration,
      timestamp: performance.now()
    })
    if (this.recentSampleList.length > this.recentWindowSize) {
      this.recentSampleList.shift()
    }
  }

  /** 记录单页单层最近一次命中的渲染引擎状态。 */
  private recordPageEngineStats(
    task: IRenderTask,
    result: IRenderBackendDispatchResult
  ): void {
    const key = this.getPageEngineStatsKey(task)
    const prevStats = this.pageEngineStatsMap.get(key)
    this.pageEngineStatsMap.set(key, {
      pageNo: task.pageNo,
      layer: task.layer,
      lastReason: task.reason,
      lastPriority: task.priority,
      lastRendered: result.rendered,
      lastBackendName: result.backendName,
      lastFailover: result.failover,
      lastFailedBackendNameList: result.failedBackendList.map(item => {
        return item.backendName
      }),
      lastDuration: result.duration,
      lastTimestamp: performance.now(),
      renderCount: (prevStats?.renderCount ?? 0) + (result.rendered ? 1 : 0),
      missCount: (prevStats?.missCount ?? 0) + (result.rendered ? 0 : 1),
      failureCount:
        (prevStats?.failureCount ?? 0) + result.failedBackendList.length,
      failoverCount:
        (prevStats?.failoverCount ?? 0) + (result.failover ? 1 : 0)
    })
  }

  /** 获取近期调度窗口统计。 */
  private getRecentWindowStats(): IRenderBackendRecentWindowStats {
    const backendHitCountMap: Record<string, number> = {}
    const backendFailureCountMap: Record<string, number> = {}
    const backendFailoverCountMap: Record<string, number> = {}
    const backendTotalDurationMap: Record<string, number> = {}
    const backendMaxDurationMap: Record<string, number> = {}
    const dispatchCountByLayer: Partial<Record<RenderLayer, number>> = {}
    const dispatchCountByReason: Partial<Record<RenderTaskReason, number>> = {}
    const dispatchCountByPriority: Partial<
      Record<RenderTaskPriority, number>
    > = {}
    const renderCountByLayer: Partial<Record<RenderLayer, number>> = {}
    const renderCountByReason: Partial<Record<RenderTaskReason, number>> = {}
    const renderCountByPriority: Partial<
      Record<RenderTaskPriority, number>
    > = {}
    let totalDuration = 0
    let maxDuration = 0
    let renderCount = 0
    let missCount = 0
    let failureCount = 0
    let failoverCount = 0
    let slowCount = 0

    this.recentSampleList.forEach(sample => {
      this.increaseCount(dispatchCountByLayer, sample.layer)
      this.increaseCount(dispatchCountByReason, sample.reason)
      this.increaseCount(dispatchCountByPriority, sample.priority)
      totalDuration += sample.duration
      maxDuration = Math.max(maxDuration, sample.duration)
      if (sample.duration > this.slowTaskThreshold) {
        slowCount++
      }
      sample.failedBackendNameList.forEach(backendName => {
        failureCount++
        backendFailureCountMap[backendName] =
          (backendFailureCountMap[backendName] ?? 0) + 1
      })
      if (sample.failover && sample.backendName) {
        failoverCount++
        backendFailoverCountMap[sample.backendName] =
          (backendFailoverCountMap[sample.backendName] ?? 0) + 1
      }
      if (!sample.rendered) {
        missCount++
        return
      }

      renderCount++
      this.increaseCount(renderCountByLayer, sample.layer)
      this.increaseCount(renderCountByReason, sample.reason)
      this.increaseCount(renderCountByPriority, sample.priority)
      if (sample.backendName) {
        backendHitCountMap[sample.backendName] =
          (backendHitCountMap[sample.backendName] ?? 0) + 1
        backendTotalDurationMap[sample.backendName] =
          (backendTotalDurationMap[sample.backendName] ?? 0) + sample.duration
        backendMaxDurationMap[sample.backendName] = Math.max(
          backendMaxDurationMap[sample.backendName] ?? 0,
          sample.duration
        )
      }
    })

    return {
      windowSize: this.recentWindowSize,
      sampleCount: this.recentSampleList.length,
      renderCount,
      missCount,
      failureCount,
      failoverCount,
      backendFailureCountMap,
      backendFailoverCountMap,
      slowCount,
      slowThreshold: this.slowTaskThreshold,
      averageDuration: this.recentSampleList.length
        ? totalDuration / this.recentSampleList.length
        : 0,
      maxDuration,
      backendDurationStatsMap: this.buildDurationStatsMap(
        backendHitCountMap,
        backendTotalDurationMap,
        backendMaxDurationMap
      ),
      taskStats: {
        dispatchCountByLayer,
        dispatchCountByReason,
        dispatchCountByPriority,
        renderCountByLayer,
        renderCountByReason,
        renderCountByPriority
      }
    }
  }

  /** 获取各后端耗时统计。 */
  private getBackendDurationStatsMap(): Record<
    string,
    IRenderBackendDurationStats
  > {
    return this.buildDurationStatsMap(
      this.backendHitCountMap,
      this.backendTotalDurationMap,
      this.backendMaxDurationMap
    )
  }

  /** 获取按页码和层排序后的引擎状态列表，便于调试面板直接展示。 */
  private getPageEngineStatsList(): IRenderBackendPageEngineStats[] {
    return Array.from(this.pageEngineStatsMap.values())
      .map(stats => ({ ...stats }))
      .sort((a, b) => {
        if (a.pageNo !== b.pageNo) {
          return a.pageNo - b.pageNo
        }
        return a.layer.localeCompare(b.layer)
      })
  }

  /** 生成单页单层引擎状态键。 */
  private getPageEngineStatsKey(task: IRenderTask): string {
    return `${task.layer}:${task.pageNo}`
  }

  /** 从命中次数和耗时表生成标准耗时统计。 */
  private buildDurationStatsMap(
    hitCountMap: Record<string, number>,
    totalDurationMap: Record<string, number>,
    maxDurationMap: Record<string, number>
  ): Record<string, IRenderBackendDurationStats> {
    return Object.keys(hitCountMap).reduce<
      Record<string, IRenderBackendDurationStats>
    >((map, backendName) => {
      const count = hitCountMap[backendName] || 0
      const totalDuration = totalDurationMap[backendName] || 0
      map[backendName] = {
        count,
        totalDuration,
        averageDuration: count ? totalDuration / count : 0,
        maxDuration: maxDurationMap[backendName] || 0
      }
      return map
    }, {})
  }

  /** 获取已注册后端的能力状态，用于调试多引擎备用路径。 */
  private getCapabilityList(): IRenderBackendCapability[] {
    return this.backendList.map(backend => {
      const capability =
        'getCapability' in backend &&
        typeof backend.getCapability === 'function'
          ? backend.getCapability()
          : {}
      return {
        name: backend.name,
        ...capability
      }
    })
  }

  /** 克隆最近一次调度结果，避免外部修改内部统计对象。 */
  private cloneDispatchResult(
    result: IRenderBackendDispatchResult | undefined
  ): IRenderBackendDispatchResult | undefined {
    if (!result) {
      return undefined
    }
    return {
      ...result,
      failedBackendList: result.failedBackendList.map(item => ({ ...item }))
    }
  }

  /** 解析未知异常为稳定可观测的错误原因。 */
  private resolveErrorReason(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  /** 清空普通对象统计表。 */
  private clearRecord<T extends string | number | symbol>(
    record: Partial<Record<T, number>>
  ) {
    Object.keys(record).forEach(key => {
      delete record[key as T]
    })
  }
}
