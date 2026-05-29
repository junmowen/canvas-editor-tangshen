import { RenderLayer } from './types/RenderLayer'

/** 位图缓存key调用载荷，聚合执行该操作所需的输入数据。 */
export interface IBitmapCacheKeyPayload {
  /** 缓存所属页码。 */
  pageNo: number
  /** 缓存所属渲染层。 */
  layer: RenderLayer
}

/** 位图缓存来源类型，用于约束内部流程中传递的数据结构。 */
export type BitmapCacheSource = 'canvas-2d-render' | 'worker-render'

/** 位图缓存设置调用载荷，聚合执行该操作所需的输入数据。 */
export interface IBitmapCacheSetPayload extends IBitmapCacheKeyPayload {
  /** 缓存的 ImageBitmap 对象。 */
  bitmap: ImageBitmap
  /** 缓存创建时的页面逻辑宽度。 */
  width: number
  /** 缓存创建时的页面逻辑高度。 */
  height: number
  /** 缓存创建时的设备像素比。 */
  dpr: number
  /** 缓存对应的内容版本，用于避免合成旧布局内容。 */
  contentVersion?: number
  /** 缓存来源，用于拆分 worker 结果和同步 Canvas2D 快照。 */
  source?: BitmapCacheSource
}

/** 位图缓存item契约，用于约束内部流程中传递的数据结构。 */
export interface IBitmapCacheItem extends IBitmapCacheSetPayload {
  /** 缓存创建时间，用于后续 LRU 淘汰。 */
  createdAt: number
  /** 最近访问时间，用于 LRU 淘汰。 */
  lastAccessedAt: number
}

/** 位图缓存composerejectreason类型，用于约束内部流程中传递的数据结构。 */
export type BitmapCacheComposeRejectReason =
  | 'page-no'
  | 'layer'
  | 'size'
  | 'dpr'
  | 'content-version'
  | 'bitmap-size'

/** 位图缓存operation类型，用于约束内部流程中传递的数据结构。 */
export type BitmapCacheOperation =
  | 'set'
  | 'hit'
  | 'miss'
  | 'delete'
  | 'stale-discard'
  | 'compose-hit'
  | 'compose-reject'
  | 'evict'

/** 位图缓存recentsample契约，用于约束内部流程中传递的数据结构。 */
export interface IBitmapCacheRecentSample {
  /** 操作类型。 */
  operation: BitmapCacheOperation
  /** 操作所属页码。 */
  pageNo?: number
  /** 操作所属渲染层。 */
  layer?: RenderLayer
  /** bitmap 来源，仅命中已有缓存或写入缓存时有值。 */
  source?: BitmapCacheSource
  /** 合成拒绝原因，仅 compose-reject 有值。 */
  rejectReason?: BitmapCacheComposeRejectReason
  /** 样本记录时间，使用 performance.now() 的时间基准。 */
  timestamp: number
}

/** 位图缓存recent窗口stats契约，用于约束内部流程中传递的数据结构。 */
export interface IBitmapCacheRecentWindowStats {
  /** 近期窗口最多保留的样本数。 */
  windowSize: number
  /** 当前窗口内样本数。 */
  sampleCount: number
  /** 当前窗口内读取命中次数。 */
  hitCount: number
  /** 当前窗口内读取未命中次数。 */
  missCount: number
  /** 当前窗口内读取命中率。 */
  hitRate: number
  /** 当前窗口内合成命中次数。 */
  composeHitCount: number
  /** 当前窗口内合成拒绝次数。 */
  composeRejectCount: number
  /** 当前窗口内合成命中率。 */
  composeHitRate: number
  /** 当前窗口内过期丢弃次数。 */
  staleDiscardCount: number
  /** 当前窗口内 LRU 淘汰次数。 */
  evictCount: number
  /** 当前窗口内操作分布。 */
  operationCountMap: Partial<Record<BitmapCacheOperation, number>>
  /** 当前窗口内来源分布。 */
  sourceCountMap: Partial<Record<BitmapCacheSource, number>>
  /** 当前窗口内合成拒绝原因分布。 */
  composeRejectReasonMap: Partial<Record<BitmapCacheComposeRejectReason, number>>
}

/** 位图缓存stats契约，用于约束内部流程中传递的数据结构。 */
export interface IBitmapCacheStats {
  /** 当前缓存数量。 */
  count: number
  /** 历史最高缓存数量。 */
  peakCount: number
  /** 当前缓存估算占用字节数。 */
  estimatedBytes: number
  /** 历史最高缓存估算占用字节数。 */
  peakEstimatedBytes: number
  /** 当前缓存估算占用 MB 数，便于调试面板直接展示。 */
  estimatedMB: number
  /** 累计写入次数。 */
  setCount: number
  /** 累计命中次数。 */
  hitCount: number
  /** 累计未命中次数。 */
  missCount: number
  /** 累计读取命中率。 */
  hitRate: number
  /** 累计删除次数。 */
  deleteCount: number
  /** 异步快照完成后因版本过期被丢弃的次数。 */
  staleDiscardCount: number
  /** 缓存通过校验并被合成回 surface 的次数。 */
  composeHitCount: number
  /** 缓存存在但因尺寸、DPR 或层级不匹配拒绝合成的次数。 */
  composeRejectCount: number
  /** 累计合成命中率。 */
  composeHitRate: number
  /** 缓存合成被拒绝的原因分布。 */
  composeRejectReasonMap: Partial<Record<BitmapCacheComposeRejectReason, number>>
  /** 因数量或内存上限触发 LRU 淘汰的次数。 */
  evictCount: number
  /** 当前缓存数量上限。 */
  maxCount: number
  /** 当前缓存估算内存上限。 */
  maxBytes: number
  /** 当前缓存按 layer 分组后的数量。 */
  countByLayer: Partial<Record<RenderLayer, number>>
  /** 当前缓存按 layer 分组后的估算字节数。 */
  estimatedBytesByLayer: Partial<Record<RenderLayer, number>>
  /** 当前缓存按来源分组后的数量。 */
  countBySource: Partial<Record<BitmapCacheSource, number>>
  /** 当前缓存按来源分组后的估算字节数。 */
  estimatedBytesBySource: Partial<Record<BitmapCacheSource, number>>
  /** 累计按来源分组的写入次数。 */
  setCountBySource: Partial<Record<BitmapCacheSource, number>>
  /** 累计按来源分组的命中次数。 */
  hitCountBySource: Partial<Record<BitmapCacheSource, number>>
  /** 累计按来源分组的合成命中次数。 */
  composeHitCountBySource: Partial<Record<BitmapCacheSource, number>>
  /** 最近一段 bitmap 缓存操作窗口统计。 */
  recentWindow: IBitmapCacheRecentWindowStats
}

/** 位图缓存选项契约，用于约束内部流程中传递的数据结构。 */
export interface IBitmapCacheOptions {
  /** 最多保留的 bitmap 缓存数量。 */
  maxCount?: number
  /** 最多保留的 bitmap 估算字节数。 */
  maxBytes?: number
}

/** 静态页 bitmap 缓存，供后续 OffscreenCanvas / ImageBitmap 合成路径使用。 */
export class BitmapCache {
  /** 默认最多保留 24 页 bitmap，避免大文档滚动后无界增长。 */
  private static readonly DEFAULT_MAX_COUNT = 24
  /** 默认最多保留 128MB 估算 bitmap 像素内存。 */
  private static readonly DEFAULT_MAX_BYTES = 128 * 1024 * 1024
  /** 实际缓存容器。 */
  private readonly cache = new Map<string, IBitmapCacheItem>()
  /** bitmap 缓存配置。 */
  private readonly options: Required<IBitmapCacheOptions>
  /** 当前缓存估算占用字节数，随 set / delete 增量维护。 */
  private estimatedBytes = 0
  /** 累计写入次数。 */
  private setCount = 0
  /** 累计按来源分组的写入次数。 */
  private readonly setCountBySource: Partial<Record<BitmapCacheSource, number>> = {}
  /** 累计命中次数。 */
  private hitCount = 0
  /** 累计按来源分组的命中次数。 */
  private readonly hitCountBySource: Partial<Record<BitmapCacheSource, number>> = {}
  /** 累计未命中次数。 */
  private missCount = 0
  /** 累计删除次数。 */
  private deleteCount = 0
  /** 异步快照完成后因版本过期被丢弃的次数。 */
  private staleDiscardCount = 0
  /** 缓存通过校验并被合成回 surface 的次数。 */
  private composeHitCount = 0
  /** 累计按来源分组的合成命中次数。 */
  private readonly composeHitCountBySource: Partial<
    Record<BitmapCacheSource, number>
  > = {}
  /** 缓存存在但因尺寸、DPR 或层级不匹配拒绝合成的次数。 */
  private composeRejectCount = 0
  /** 缓存合成被拒绝的原因分布。 */
  private readonly composeRejectReasonMap: Partial<
    Record<BitmapCacheComposeRejectReason, number>
  > = {}
  /** 因数量或内存上限触发 LRU 淘汰的次数。 */
  private evictCount = 0
  /** 历史最高缓存数量。 */
  private peakCount = 0
  /** 历史最高缓存估算占用字节数。 */
  private peakEstimatedBytes = 0
  /** 近期缓存操作窗口样本，用于观察滚动后的短期命中情况。 */
  private readonly recentSampleList: IBitmapCacheRecentSample[] = []
  /** 近期缓存操作窗口最大样本数。 */
  private readonly recentWindowSize = 160

  /**
   * 创建 bitmap 缓存容器。
   *
   * @param options - 缓存数量和内存上限配置
   */
  constructor(options: IBitmapCacheOptions = {}) {
    this.options = {
      maxCount: options.maxCount ?? BitmapCache.DEFAULT_MAX_COUNT,
      maxBytes: options.maxBytes ?? BitmapCache.DEFAULT_MAX_BYTES
    }
  }

  /** 写入指定页指定层的 bitmap 缓存。 */
  public set(item: IBitmapCacheSetPayload) {
    this.setCount++
    this.increaseSourceCount(this.setCountBySource, item.source)
    const key = this.getKey(item)
    this.deleteByKey(key)
    const now = Date.now()
    this.cache.set(key, {
      ...item,
      createdAt: now,
      lastAccessedAt: now
    })
    this.estimatedBytes += this.getItemEstimatedBytes(item)
    this.recordRecentSample('set', item)
    this.prune()
    this.updatePeakStats()
  }

  /** 读取指定页指定层的 bitmap 缓存。 */
  public get(payload: IBitmapCacheKeyPayload): IBitmapCacheItem | undefined {
    const item = this.cache.get(this.getKey(payload))
    if (item) {
      this.hitCount++
      this.increaseSourceCount(this.hitCountBySource, item.source)
      item.lastAccessedAt = Date.now()
      this.recordRecentSample('hit', item)
      return item
    }
    this.missCount++
    this.recordRecentSample('miss', payload)
    return undefined
  }

  /** 记录一次过期 bitmap 被丢弃，供后续分析频繁重绘或失效抖动。 */
  public recordStaleDiscard(payload?: IBitmapCacheKeyPayload) {
    this.staleDiscardCount++
    this.recordRecentSample('stale-discard', payload)
  }

  /** 记录一次 bitmap 缓存合成成功。 */
  public recordComposeHit(payload?: IBitmapCacheKeyPayload & {
    /** 数据来源标识，用于区分渲染、缓存或事件来源。 */
    source?: BitmapCacheSource
  }) {
    this.composeHitCount++
    this.increaseSourceCount(this.composeHitCountBySource, payload?.source)
    this.recordRecentSample('compose-hit', payload)
  }

  /** 记录一次 bitmap 缓存合成被安全校验拒绝。 */
  public recordComposeReject(
    reason: BitmapCacheComposeRejectReason,
    payload?: IBitmapCacheKeyPayload
  ) {
    this.composeRejectCount++
    this.composeRejectReasonMap[reason] =
      (this.composeRejectReasonMap[reason] ?? 0) + 1
    this.recordRecentSample('compose-reject', payload, reason)
  }

  /** 删除指定页指定层的 bitmap 缓存。 */
  public delete(payload: IBitmapCacheKeyPayload) {
    this.deleteByKey(this.getKey(payload))
  }

  /** 删除指定页的所有 bitmap 缓存。 */
  public deletePage(pageNo: number) {
    Array.from(this.cache.values()).forEach(item => {
      if (item.pageNo === pageNo) {
        this.delete(item)
      }
    })
  }

  /** 清空所有 bitmap 缓存。 */
  public clear() {
    Array.from(this.cache.keys()).forEach(key => this.deleteByKey(key))
  }

  /** 获取 bitmap 缓存统计信息。 */
  public getStats(): IBitmapCacheStats {
    const layerStats = this.getLayerStats()
    const sourceStats = this.getSourceStats()
    return {
      count: this.cache.size,
      peakCount: this.peakCount,
      estimatedBytes: this.estimatedBytes,
      peakEstimatedBytes: this.peakEstimatedBytes,
      estimatedMB: Math.round((this.estimatedBytes / 1024 / 1024) * 100) / 100,
      setCount: this.setCount,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.getRate(this.hitCount, this.hitCount + this.missCount),
      deleteCount: this.deleteCount,
      staleDiscardCount: this.staleDiscardCount,
      composeHitCount: this.composeHitCount,
      composeRejectCount: this.composeRejectCount,
      composeHitRate: this.getRate(
        this.composeHitCount,
        this.composeHitCount + this.composeRejectCount
      ),
      composeRejectReasonMap: { ...this.composeRejectReasonMap },
      evictCount: this.evictCount,
      maxCount: this.options.maxCount,
      maxBytes: this.options.maxBytes,
      countByLayer: layerStats.countByLayer,
      estimatedBytesByLayer: layerStats.estimatedBytesByLayer,
      countBySource: sourceStats.countBySource,
      estimatedBytesBySource: sourceStats.estimatedBytesBySource,
      setCountBySource: { ...this.setCountBySource },
      hitCountBySource: { ...this.hitCountBySource },
      composeHitCountBySource: { ...this.composeHitCountBySource },
      recentWindow: this.getRecentWindowStats()
    }
  }

  /** 重置 bitmap 缓存统计，不清空现有缓存内容。 */
  public resetStats() {
    this.setCount = 0
    this.hitCount = 0
    this.missCount = 0
    this.deleteCount = 0
    this.staleDiscardCount = 0
    this.composeHitCount = 0
    this.composeRejectCount = 0
    this.evictCount = 0
    this.recentSampleList.length = 0
    this.clearSourceCount(this.setCountBySource)
    this.clearSourceCount(this.hitCountBySource)
    this.clearSourceCount(this.composeHitCountBySource)
    Object.keys(this.composeRejectReasonMap).forEach(reason => {
      delete this.composeRejectReasonMap[
        reason as BitmapCacheComposeRejectReason
      ]
    })
    // 高水位以当前缓存为新基线，便于单场景测试观察后续增长。
    this.peakCount = this.cache.size
    this.peakEstimatedBytes = this.estimatedBytes
  }

  /** 根据页码和层生成稳定缓存键。 */
  private getKey(payload: IBitmapCacheKeyPayload): string {
    return `${payload.layer}:${payload.pageNo}`
  }

  /** 按缓存键删除 bitmap，并主动 close 释放图形资源。 */
  private deleteByKey(key: string) {
    const item = this.cache.get(key)
    if (!item) return
    this.estimatedBytes = Math.max(
      0,
      this.estimatedBytes - this.getItemEstimatedBytes(item)
    )
    item.bitmap.close()
    this.cache.delete(key)
    this.deleteCount++
    this.recordRecentSample('delete', item)
  }

  /** 按数量和估算内存上限裁剪缓存，优先淘汰最久未访问项。 */
  private prune() {
    while (
      this.cache.size > this.options.maxCount ||
      this.estimatedBytes > this.options.maxBytes
    ) {
      const key = this.getLeastRecentlyUsedKey()
      if (!key) return
      this.deleteByKey(key)
      this.evictCount++
      this.recordRecentSample('evict')
    }
  }

  /** 更新 bitmap 缓存历史峰值统计。 */
  private updatePeakStats() {
    this.peakCount = Math.max(this.peakCount, this.cache.size)
    this.peakEstimatedBytes = Math.max(
      this.peakEstimatedBytes,
      this.estimatedBytes
    )
  }

  /** 获取最久未访问的缓存键。 */
  private getLeastRecentlyUsedKey(): string | undefined {
    let result: { key: string; lastAccessedAt: number } | undefined
    this.cache.forEach((item, key) => {
      if (!result || item.lastAccessedAt < result.lastAccessedAt) {
        result = { key, lastAccessedAt: item.lastAccessedAt }
      }
    })
    return result?.key
  }

  /** 估算单个 bitmap 缓存项的像素内存，按 RGBA 4 字节粗略计算。 */
  private getItemEstimatedBytes(item: IBitmapCacheSetPayload): number {
    return Math.ceil(item.width * item.dpr) * Math.ceil(item.height * item.dpr) * 4
  }

  /** 单次遍历生成按 layer 分组的数量和内存统计。 */
  private getLayerStats(): {
    /** 按图层统计的缓存数量，用于定位各层资源占用。 */
    countByLayer: Partial<Record<RenderLayer, number>>
    /** 按图层统计的估算字节数，用于分析各层内存占用。 */
    estimatedBytesByLayer: Partial<Record<RenderLayer, number>>
  } {
    return Array.from(this.cache.values()).reduce<{
      /** 按图层统计的缓存数量，用于定位各层资源占用。 */
      countByLayer: Partial<Record<RenderLayer, number>>
      /** 按图层统计的估算字节数，用于分析各层内存占用。 */
      estimatedBytesByLayer: Partial<Record<RenderLayer, number>>
    }>(
      (stats, item) => {
        stats.countByLayer[item.layer] =
          (stats.countByLayer[item.layer] ?? 0) + 1
        stats.estimatedBytesByLayer[item.layer] =
          (stats.estimatedBytesByLayer[item.layer] ?? 0) +
          this.getItemEstimatedBytes(item)
        return stats
      },
      {
        countByLayer: {},
        estimatedBytesByLayer: {}
      }
    )
  }

  /** 单次遍历生成按来源分组的数量和内存统计。 */
  private getSourceStats(): {
    /** 按来源统计的缓存数量，用于分析不同渲染源的缓存规模。 */
    countBySource: Partial<Record<BitmapCacheSource, number>>
    /** 按来源统计的估算字节数，用于分析不同渲染源的内存占用。 */
    estimatedBytesBySource: Partial<Record<BitmapCacheSource, number>>
  } {
    return Array.from(this.cache.values()).reduce<{
      /** 按来源统计的缓存数量，用于分析不同渲染源的缓存规模。 */
      countBySource: Partial<Record<BitmapCacheSource, number>>
      /** 按来源统计的估算字节数，用于分析不同渲染源的内存占用。 */
      estimatedBytesBySource: Partial<Record<BitmapCacheSource, number>>
    }>(
      (stats, item) => {
        if (!item.source) {
          return stats
        }
        stats.countBySource[item.source] =
          (stats.countBySource[item.source] ?? 0) + 1
        stats.estimatedBytesBySource[item.source] =
          (stats.estimatedBytesBySource[item.source] ?? 0) +
          this.getItemEstimatedBytes(item)
        return stats
      },
      {
        countBySource: {},
        estimatedBytesBySource: {}
      }
    )
  }

  /** 记录近期操作样本，并保持固定窗口长度。 */
  private recordRecentSample(
    operation: BitmapCacheOperation,
    payload?: IBitmapCacheKeyPayload & { source?: BitmapCacheSource },
    rejectReason?: BitmapCacheComposeRejectReason
  ) {
    this.recentSampleList.push({
      operation,
      pageNo: payload?.pageNo,
      layer: payload?.layer,
      source: payload?.source,
      rejectReason,
      timestamp: performance.now()
    })
    if (this.recentSampleList.length > this.recentWindowSize) {
      this.recentSampleList.shift()
    }
  }

  /** 获取近期 bitmap 缓存操作窗口统计。 */
  private getRecentWindowStats(): IBitmapCacheRecentWindowStats {
    const operationCountMap: Partial<Record<BitmapCacheOperation, number>> = {}
    const sourceCountMap: Partial<Record<BitmapCacheSource, number>> = {}
    const composeRejectReasonMap: Partial<
      Record<BitmapCacheComposeRejectReason, number>
    > = {}
    this.recentSampleList.forEach(sample => {
      operationCountMap[sample.operation] =
        (operationCountMap[sample.operation] ?? 0) + 1
      if (sample.rejectReason) {
        composeRejectReasonMap[sample.rejectReason] =
          (composeRejectReasonMap[sample.rejectReason] ?? 0) + 1
      }
      if (sample.source) {
        sourceCountMap[sample.source] = (sourceCountMap[sample.source] ?? 0) + 1
      }
    })
    const hitCount = operationCountMap.hit ?? 0
    const missCount = operationCountMap.miss ?? 0
    const composeHitCount = operationCountMap['compose-hit'] ?? 0
    const composeRejectCount = operationCountMap['compose-reject'] ?? 0
    return {
      windowSize: this.recentWindowSize,
      sampleCount: this.recentSampleList.length,
      hitCount,
      missCount,
      hitRate: this.getRate(hitCount, hitCount + missCount),
      composeHitCount,
      composeRejectCount,
      composeHitRate: this.getRate(
        composeHitCount,
        composeHitCount + composeRejectCount
      ),
      staleDiscardCount: operationCountMap['stale-discard'] ?? 0,
      evictCount: operationCountMap.evict ?? 0,
      operationCountMap,
      sourceCountMap,
      composeRejectReasonMap
    }
  }

  /** 递增来源分组计数。 */
  private increaseSourceCount(
    map: Partial<Record<BitmapCacheSource, number>>,
    source?: BitmapCacheSource
  ) {
    if (!source) return
    map[source] = (map[source] ?? 0) + 1
  }

  /** 清空来源计数表。 */
  private clearSourceCount(map: Partial<Record<BitmapCacheSource, number>>) {
    Object.keys(map).forEach(source => {
      delete map[source as BitmapCacheSource]
    })
  }

  /** 计算比例并保留四位小数，便于调试面板稳定展示。 */
  private getRate(count: number, total: number): number {
    if (!total) return 0
    return Math.round((count / total) * 10000) / 10000
  }
}
