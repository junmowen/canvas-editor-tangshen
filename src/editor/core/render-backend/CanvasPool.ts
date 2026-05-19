import { RenderLayer } from './types/RenderLayer'

/** 申请 canvas 池资源时需要提供的尺寸和层信息。 */
export interface ICanvasPoolAcquireOptions {
  /** 目标渲染层。 */
  layer: RenderLayer
  /** CSS 逻辑宽度，单位为 px。 */
  width: number
  /** CSS 逻辑高度，单位为 px。 */
  height: number
  /** 设备像素比，用于计算 backing store 尺寸。 */
  dpr: number
  /** 是否创建透明上下文，当前阶段默认保持透明以兼容旧清屏行为。 */
  alpha?: boolean
}

/** canvas 池中的单个可复用资源。 */
export interface ICanvasPoolItem {
  /** 被复用的 canvas DOM。 */
  canvas: HTMLCanvasElement
  /** 与 canvas 绑定的 2D 上下文。 */
  ctx: CanvasRenderingContext2D
  /** 当前记录的 CSS 逻辑宽度。 */
  width: number
  /** 当前记录的 CSS 逻辑高度。 */
  height: number
  /** 当前记录的设备像素比。 */
  dpr: number
  /** 该资源所属渲染层。 */
  layer: RenderLayer
  /** 该资源是否使用透明上下文。 */
  alpha: boolean
}

/** canvas 池调试统计，用于观察复用率和资源增长。 */
export interface ICanvasPoolStats {
  /** 当前空闲资源数量。 */
  idleCount: number
  /** 历史最高空闲资源数量。 */
  peakIdleCount: number
  /** 累计申请次数。 */
  acquireCount: number
  /** 累计创建新 canvas 次数。 */
  createCount: number
  /** 累计释放次数。 */
  releaseCount: number
  /** 累计命中空闲池次数。 */
  hitCount: number
  /** 累计空闲池复用命中率。 */
  hitRate: number
  /** 当前空闲池按 layer 分组后的数量。 */
  idleLayerCountMap: Partial<Record<RenderLayer, number>>
  /** 当前空闲 canvas backing store 估算字节数。 */
  estimatedIdleBytes: number
  /** 历史最高空闲 canvas backing store 估算字节数。 */
  peakEstimatedIdleBytes: number
  /** 当前空闲 canvas backing store 估算 MB。 */
  estimatedIdleMB: number
  /** 当前空闲池按 layer 分组后的 backing store 估算字节数。 */
  estimatedIdleBytesByLayer: Partial<Record<RenderLayer, number>>
}

/** canvas 池配置，用于控制空闲资源上限。 */
export interface ICanvasPoolOptions {
  /** 全局最大空闲 canvas 数量。 */
  maxIdleCount?: number
  /** 每个渲染层最大空闲 canvas 数量。 */
  maxIdleCountPerLayer?: Partial<Record<RenderLayer, number>>
}

/** canvas 资源池，负责复用 canvas DOM 和 2D 上下文。 */
export class CanvasPool {
  /** 默认全局空闲资源上限。 */
  private static readonly DEFAULT_MAX_IDLE_COUNT = 8
  /** 默认单层空闲资源上限。 */
  private static readonly DEFAULT_MAX_IDLE_COUNT_PER_LAYER = 2
  /** 空闲 canvas 资源列表。 */
  private readonly idleItemList: ICanvasPoolItem[] = []
  /** canvas 池配置，控制空闲资源回收策略。 */
  private readonly options: Required<ICanvasPoolOptions>
  /** 累计申请次数。 */
  private acquireCount = 0
  /** 累计新建 canvas 次数。 */
  private createCount = 0
  /** 累计归还资源次数。 */
  private releaseCount = 0
  /** 累计从空闲池复用资源次数。 */
  private hitCount = 0
  /** 当前空闲 canvas backing store 估算字节数，随出入池增量维护。 */
  private estimatedIdleBytes = 0
  /** 历史最高空闲资源数量。 */
  private peakIdleCount = 0
  /** 历史最高空闲 canvas backing store 估算字节数。 */
  private peakEstimatedIdleBytes = 0

  /**
   * 创建 canvas 资源池。
   *
   * @param options - 空闲资源上限配置
   */
  constructor(options: ICanvasPoolOptions = {}) {
    this.options = {
      maxIdleCount:
        options.maxIdleCount ?? CanvasPool.DEFAULT_MAX_IDLE_COUNT,
      maxIdleCountPerLayer: {
        [RenderLayer.BASE]: CanvasPool.DEFAULT_MAX_IDLE_COUNT_PER_LAYER,
        [RenderLayer.OVERLAY]: CanvasPool.DEFAULT_MAX_IDLE_COUNT_PER_LAYER,
        [RenderLayer.EXPORT]: 2,
        [RenderLayer.MEASURE]: 2,
        ...options.maxIdleCountPerLayer
      }
    }
  }

  /** 从池中申请一个符合 layer / alpha 的 canvas 资源。 */
  public acquire(options: ICanvasPoolAcquireOptions): ICanvasPoolItem {
    this.acquireCount++
    const alpha = options.alpha ?? true
    // 第一阶段先按 layer 和 alpha 分组，避免透明层与白底层混用。
    const index = this.idleItemList.findIndex(item =>
      item.layer === options.layer && item.alpha === alpha
    )
    const item = index >= 0
      ? this.takeIdleItem(index)
      : this.createItem(options, alpha)
    if (index >= 0) {
      this.hitCount++
    }
    this.resize(item, options.width, options.height, options.dpr)
    return item
  }

  /** 释放 canvas 资源并放回空闲池。 */
  public release(item: ICanvasPoolItem) {
    this.releaseCount++
    // 先从 DOM 上卸载，确保复用前不会继续参与页面布局和命中。
    item.canvas.remove()
    this.clear(item)
    this.resetContext(item)
    this.idleItemList.push(item)
    this.estimatedIdleBytes += this.getEstimatedItemBytes(item)
    this.pruneIdleItems()
    this.updatePeakStats()
  }

  /** 调整 canvas 尺寸，并重置上下文到标准页面坐标系。 */
  public resize(
    item: ICanvasPoolItem,
    width: number,
    height: number,
    dpr: number
  ) {
    // backing store 使用物理像素，CSS 尺寸继续使用逻辑像素。
    const physicalWidth = Math.floor(width * dpr)
    const physicalHeight = Math.floor(height * dpr)
    if (item.canvas.width !== physicalWidth) {
      item.canvas.width = physicalWidth
    }
    if (item.canvas.height !== physicalHeight) {
      item.canvas.height = physicalHeight
    }
    item.width = width
    item.height = height
    item.dpr = dpr
    item.canvas.style.width = `${width}px`
    item.canvas.style.height = `${height}px`
    this.resetContext(item)
  }

  /** 清空 canvas 当前像素内容。 */
  public clear(item: ICanvasPoolItem) {
    item.ctx.clearRect(0, 0, item.canvas.width, item.canvas.height)
  }

  /** 裁剪空闲池，避免高 DPR 大画布长期占用内存。 */
  public prune(maxIdleCount: number) {
    if (this.idleItemList.length <= maxIdleCount) return
    const removedItemList = this.idleItemList.splice(
      0,
      this.idleItemList.length - maxIdleCount
    )
    removedItemList.forEach(item => this.disposeIdleItem(item))
  }

  /** 释放所有空闲资源引用。 */
  public dispose() {
    this.idleItemList.forEach(item => this.disposeIdleItem(item))
    this.idleItemList.length = 0
    this.estimatedIdleBytes = 0
  }

  /** 获取池化调试统计。 */
  public getStats(): ICanvasPoolStats {
    const layerStats = this.getIdleLayerStats()
    return {
      idleCount: this.idleItemList.length,
      peakIdleCount: this.peakIdleCount,
      acquireCount: this.acquireCount,
      createCount: this.createCount,
      releaseCount: this.releaseCount,
      hitCount: this.hitCount,
      hitRate: this.getRate(this.hitCount, this.acquireCount),
      idleLayerCountMap: layerStats.idleLayerCountMap,
      estimatedIdleBytes: this.estimatedIdleBytes,
      peakEstimatedIdleBytes: this.peakEstimatedIdleBytes,
      estimatedIdleMB: this.toMB(this.estimatedIdleBytes),
      estimatedIdleBytesByLayer: layerStats.estimatedIdleBytesByLayer
    }
  }

  /** 重置池化统计，不释放当前空闲资源。 */
  public resetStats() {
    this.acquireCount = 0
    this.createCount = 0
    this.releaseCount = 0
    this.hitCount = 0
    // 高水位以当前空闲池为新基线，便于单场景测试观察后续增长。
    this.peakIdleCount = this.idleItemList.length
    this.peakEstimatedIdleBytes = this.estimatedIdleBytes
  }

  /** 按配置裁剪空闲池，避免高 DPR 大画布长期占用内存。 */
  private pruneIdleItems() {
    this.prune(this.options.maxIdleCount)
    Object.values(RenderLayer).forEach(layer => {
      const maxLayerIdleCount =
        this.options.maxIdleCountPerLayer[layer] ??
        CanvasPool.DEFAULT_MAX_IDLE_COUNT_PER_LAYER
      const layerItemIndexList = this.idleItemList
        .map((item, index) => item.layer === layer ? index : -1)
        .filter(index => index >= 0)
      const removeCount = layerItemIndexList.length - maxLayerIdleCount
      if (removeCount <= 0) return
      // 从较早释放的资源开始裁剪，保留最近归还的 canvas 以提高命中率。
      for (let i = removeCount - 1; i >= 0; i--) {
        const [removedItem] = this.idleItemList.splice(layerItemIndexList[i], 1)
        if (removedItem) {
          this.disposeIdleItem(removedItem)
        }
      }
    })
  }

  /** 更新空闲池历史峰值统计。 */
  private updatePeakStats() {
    this.peakIdleCount = Math.max(this.peakIdleCount, this.idleItemList.length)
    this.peakEstimatedIdleBytes = Math.max(
      this.peakEstimatedIdleBytes,
      this.estimatedIdleBytes
    )
  }

  /** 从空闲池取出资源，并同步扣减空闲内存估算。 */
  private takeIdleItem(index: number): ICanvasPoolItem {
    const [item] = this.idleItemList.splice(index, 1)
    this.estimatedIdleBytes = Math.max(
      0,
      this.estimatedIdleBytes - this.getEstimatedItemBytes(item)
    )
    return item
  }

  /** 释放空闲资源，并同步扣减空闲内存估算。 */
  private disposeIdleItem(item: ICanvasPoolItem) {
    this.estimatedIdleBytes = Math.max(
      0,
      this.estimatedIdleBytes - this.getEstimatedItemBytes(item)
    )
    this.disposeItem(item)
  }

  /** 主动释放单个 canvas 的 backing store。 */
  private disposeItem(item: ICanvasPoolItem) {
    item.canvas.remove()
    item.canvas.width = 0
    item.canvas.height = 0
    item.canvas.style.width = '0px'
    item.canvas.style.height = '0px'
    item.width = 0
    item.height = 0
  }

  /** 估算单个 canvas backing store 占用字节数。 */
  private getEstimatedItemBytes(item: ICanvasPoolItem): number {
    return item.canvas.width * item.canvas.height * 4
  }

  /** 单次遍历生成空闲资源按 layer 分组后的数量和内存统计。 */
  private getIdleLayerStats(): {
    idleLayerCountMap: Partial<Record<RenderLayer, number>>
    estimatedIdleBytesByLayer: Partial<Record<RenderLayer, number>>
  } {
    return this.idleItemList.reduce<{
      idleLayerCountMap: Partial<Record<RenderLayer, number>>
      estimatedIdleBytesByLayer: Partial<Record<RenderLayer, number>>
    }>(
      (stats, item) => {
        stats.idleLayerCountMap[item.layer] =
          (stats.idleLayerCountMap[item.layer] ?? 0) + 1
        stats.estimatedIdleBytesByLayer[item.layer] =
          (stats.estimatedIdleBytesByLayer[item.layer] ?? 0) +
          this.getEstimatedItemBytes(item)
        return stats
      },
      {
        idleLayerCountMap: {},
        estimatedIdleBytesByLayer: {}
      }
    )
  }

  /** 将字节数转换为 MB，保留两位小数。 */
  private toMB(bytes: number): number {
    return Math.round((bytes / 1024 / 1024) * 100) / 100
  }

  /** 计算比例并保留四位小数，便于调试面板稳定展示。 */
  private getRate(count: number, total: number): number {
    if (!total) return 0
    return Math.round((count / total) * 10000) / 10000
  }

  /** 创建新的 canvas 池资源。 */
  private createItem(
    options: ICanvasPoolAcquireOptions,
    alpha: boolean
  ): ICanvasPoolItem {
    this.createCount++
    const canvas = document.createElement('canvas')
    // 第一阶段保持透明上下文，避免 clearRect 在不透明 canvas 上暴露黑底。
    const ctx = canvas.getContext('2d', { alpha })!
    const item: ICanvasPoolItem = {
      canvas,
      ctx,
      width: 0,
      height: 0,
      dpr: options.dpr,
      layer: options.layer,
      alpha
    }
    this.formatCanvas(item)
    return item
  }

  /** 初始化 canvas DOM 样式和 layer 标识。 */
  private formatCanvas(item: ICanvasPoolItem) {
    const { canvas, layer } = item
    canvas.style.position = 'absolute'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.display = 'block'
    canvas.style.margin = '0'
    canvas.style.border = '0'
    canvas.style.outline = '0'
    canvas.style.boxShadow = 'none'
    canvas.style.zIndex = layer === RenderLayer.OVERLAY ? '1' : '0'
    canvas.style.backgroundColor =
      layer === RenderLayer.BASE ? '#ffffff' : 'transparent'
    canvas.style.pointerEvents = layer === RenderLayer.BASE ? 'auto' : 'none'
    canvas.setAttribute('data-layer', layer)
    if (layer === RenderLayer.BASE) {
      canvas.style.cursor = 'text'
    }
  }

  /** 重置 2D 上下文，防止 transform、alpha、字体方向等状态串页。 */
  private resetContext(item: ICanvasPoolItem) {
    const { ctx, dpr } = item
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, item.canvas.width, item.canvas.height)
    ctx.scale(dpr, dpr)
    ctx.letterSpacing = '0px'
    ctx.wordSpacing = '0px'
    ctx.direction = 'ltr'
  }
}
