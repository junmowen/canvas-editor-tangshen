import { CanvasPool } from './CanvasPool'
import {
  BitmapCacheSource,
  BitmapCacheComposeRejectReason,
  BitmapCache,
  IBitmapCacheItem,
  IBitmapCacheKeyPayload
} from './BitmapCache'
import { RenderLayer } from './types/RenderLayer'
import {
  IRenderSurface,
  IRenderSurfacePageState
} from './types/RenderSurface'

/** 渲染渲染面metrics契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurfaceMetrics {
  /** 获取页面 CSS 逻辑宽度。 */
  getWidth(): number
  /** 获取页面 CSS 逻辑高度。 */
  getHeight(): number
  /** 获取页面间距。 */
  getPageGap(): number
  /** 获取当前页面设备像素比。 */
  getPagePixelRatio(): number
}

/** 渲染渲染面mount选项契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurfaceMountOptions {
  /** 目标页码。 */
  pageNo: number
  /** 目标页 wrapper，base 和 overlay canvas 会挂载到这里。 */
  pageWrapper: HTMLDivElement
}

/** 渲染渲染面创建选项契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurfaceCreateOptions {
  /** 目标页码。 */
  pageNo: number
  /** 目标渲染层。 */
  layer: RenderLayer
  /** 页面 CSS 逻辑宽度。 */
  width: number
  /** 页面 CSS 逻辑高度。 */
  height: number
  /** 当前设备像素比。 */
  dpr: number
  /** 是否已挂载到页面 DOM。 */
  mounted?: boolean
}

/** 渲染渲染面位图缓存选项契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurfaceBitmapCacheOptions {
  /** 当前内容版本，通常来自本轮布局快照版本。 */
  contentVersion?: number
  /** bitmap 来源，用于区分同步 Canvas2D 快照和 worker 结果。 */
  source?: BitmapCacheSource
}

/** 渲染渲染面位图compose选项契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurfaceBitmapComposeOptions {
  /** 期望合成的内容版本，和缓存写入版本不一致时拒绝合成。 */
  contentVersion?: number
}

/** 渲染渲染面resize选项契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurfaceResizeOptions {
  /** 目标页码。 */
  pageNo: number
  /** 页面 CSS 逻辑宽度。 */
  width: number
  /** 页面 CSS 逻辑高度。 */
  height: number
  /** surface 自身 CSS 逻辑高度。用于连页长文档按 canvas tile 承载。 */
  surfaceHeight?: number
  /** 当前设备像素比。 */
  dpr: number
  /** 页面间距。 */
  pageGap: number
  /** 页面 wrapper DOM。 */
  pageWrapper: HTMLDivElement
  /** 页面 overlay host DOM。 */
  overlayHost: HTMLDivElement
}

/** 渲染渲染面managerstats契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurfaceManagerStats {
  /** 当前页面槽位数量。 */
  pageCount: number
  /** 已挂载 base surface 数量。 */
  mountedBaseCount: number
  /** 已挂载 overlay surface 数量。 */
  mountedOverlayCount: number
  /** 当前是否存在测量 surface。 */
  hasMeasureSurface: boolean
  /** 已挂载 surface backing store 估算字节数。 */
  estimatedMountedBytes: number
  /** 已挂载 surface backing store 估算 MB 数。 */
  estimatedMountedMB: number
  /** 已挂载 surface 按 layer 分组后的估算字节数。 */
  estimatedMountedBytesByLayer: Partial<Record<RenderLayer, number>>
  /** 测量 surface backing store 估算字节数。 */
  estimatedMeasureBytes: number
  /** 当前活跃临时 surface 数量。 */
  transientSurfaceCount: number
  /** 当前活跃临时 surface backing store 估算字节数。 */
  estimatedTransientBytes: number
  /** 当前活跃临时 surface backing store 估算 MB 数。 */
  estimatedTransientMB: number
  /** 当前活跃临时 surface 按 layer 分组后的估算字节数。 */
  estimatedTransientBytesByLayer: Partial<Record<RenderLayer, number>>
  /** 当前活跃 surface backing store 总估算字节数。 */
  estimatedActiveBytes: number
  /** 当前活跃 surface backing store 总估算 MB 数。 */
  estimatedActiveMB: number
  /** 历史最高活跃 surface backing store 总估算字节数。 */
  peakEstimatedActiveBytes: number
  /** bitmap 缓存统计信息。 */
  bitmapCache: ReturnType<BitmapCache['getStats']>
  /** 已挂载 base surface 页码列表。 */
  mountedBasePageNoList: number[]
  /** 已挂载 overlay surface 页码列表。 */
  mountedOverlayPageNoList: number[]
}

/** 渲染 surface 管理器，负责 pageNo、layer、canvas 池资源之间的绑定。 */
export class RenderSurfaceManager {
  /** pageNo 到 base / overlay surface 的状态映射。 */
  private surfacePageStateList: IRenderSurfacePageState[] = []
  /** 复用中的测量 surface，供文本测量和布局计算共享。 */
  private measureSurface?: IRenderSurface
  /** 当前活跃的临时 surface 集合，供导出和水印等短生命周期链路观测。 */
  private readonly transientSurfaceSet = new Set<IRenderSurface>()
  /** 历史最高活跃 surface backing store 总估算字节数。 */
  private peakEstimatedActiveBytes = 0
  /** 静态页 bitmap 缓存，后续用于 base 层快速合成。 */
  private readonly bitmapCache = new BitmapCache()
  /** bitmap 缓存版本号，用于丢弃过期的异步快照写入。 */
  private readonly bitmapCacheVersionMap = new Map<string, number>()
  /** bitmap 缓存写入序号，用于丢弃同版本下更早发起但更晚完成的异步快照。 */
  private readonly bitmapCacheWriteSequenceMap = new Map<string, number>()

  /** 创建 surface 管理器。 */
  constructor(
    private readonly metrics: IRenderSurfaceMetrics,
    private readonly canvasPool = new CanvasPool()
  ) {}

  /** 获取指定页指定层的 surface。 */
  public getSurface(
    pageNo: number,
    layer: RenderLayer
  ): IRenderSurface | undefined {
    const state = this.surfacePageStateList[pageNo]
    if (layer === RenderLayer.BASE) {
      return state?.base
    }
    if (layer === RenderLayer.OVERLAY) {
      return state?.overlay
    }
    return undefined
  }

  /** 获取指定层的 surface 列表，顺序和 pageNo 保持一致。 */
  public getSurfaceList(layer: RenderLayer): (IRenderSurface | undefined)[] {
    return this.surfacePageStateList.map(state => {
      if (layer === RenderLayer.BASE) {
        return state.base
      }
      if (layer === RenderLayer.OVERLAY) {
        return state.overlay
      }
      return undefined
    })
  }

  /** 获取当前页面数量。 */
  public getPageCount(): number {
    return this.surfacePageStateList.length
  }

  /** 增加一页空 surface 槽位。 */
  public addPage() {
    this.surfacePageStateList.push({})
  }

  /** 移除最后一页 surface 槽位，并先回收已挂载资源。 */
  public removeLastPage() {
    const pageNo = this.surfacePageStateList.length - 1
    if (pageNo < 0) return
    this.unmountPage(pageNo)
    this.surfacePageStateList.pop()
  }

  /** 挂载指定页的 base 和 overlay surface。 */
  public mountPage(options: IRenderSurfaceMountOptions) {
    const { pageNo, pageWrapper } = options
    const state = this.surfacePageStateList[pageNo]
    if (state?.base) return
    const width = this.metrics.getWidth()
    const height = this.metrics.getHeight()
    const dpr = this.metrics.getPagePixelRatio()
    const baseSurface = this.createSurface({
      pageNo,
      layer: RenderLayer.BASE,
      host: pageWrapper,
      width,
      height,
      dpr,
      mounted: true
    })
    const overlaySurface = this.createSurface({
      pageNo,
      layer: RenderLayer.OVERLAY,
      host: pageWrapper,
      width,
      height,
      dpr,
      mounted: true
    })

    // base 放到 wrapper 首位，overlay 放在 base 之后，保持旧 DOM 层级语义。
    pageWrapper.insertBefore(baseSurface.canvas, pageWrapper.firstChild)
    pageWrapper.append(overlaySurface.canvas)

    this.surfacePageStateList[pageNo] = {
      base: baseSurface,
      overlay: overlaySurface
    }
  }

  /** 卸载指定页 surface，并把 canvas 归还资源池。 */
  public unmountPage(pageNo: number) {
    const state = this.surfacePageStateList[pageNo]
    if (!state?.base || !state.overlay) return
    // 页面卸载时保留 base bitmap，供滚回页面时复用；overlay 交互态必须失效。
    this.invalidateBitmapCache({ pageNo, layer: RenderLayer.OVERLAY })
    this.releaseSurface(state.base)
    this.releaseSurface(state.overlay)
    this.surfacePageStateList[pageNo] = {}
  }

  /** 同步指定页 surface、page wrapper 和 overlay host 尺寸。 */
  public resizePage(options: IRenderSurfaceResizeOptions) {
    const {
      pageNo,
      width,
      height,
      surfaceHeight = height,
      dpr,
      pageGap,
      pageWrapper,
      overlayHost
    } = options
    const state = this.surfacePageStateList[pageNo]
    // 已挂载页需要同步 backing store，未挂载页只更新 DOM host 尺寸。
    if (state?.base) {
      if (this.hasSurfaceSizeChanged(state.base, width, surfaceHeight, dpr)) {
        this.invalidateBitmapCache({ pageNo, layer: RenderLayer.BASE })
      }
      this.resizeSurface(state.base, width, surfaceHeight, dpr)
      state.base.offsetY = 0
    }
    if (state?.overlay) {
      if (this.hasSurfaceSizeChanged(state.overlay, width, surfaceHeight, dpr)) {
        this.invalidateBitmapCache({ pageNo, layer: RenderLayer.OVERLAY })
      }
      this.resizeSurface(state.overlay, width, surfaceHeight, dpr)
      state.overlay.offsetY = 0
    }
    overlayHost.style.width = `${width}px`
    overlayHost.style.height = `${height}px`
    pageWrapper.style.width = `${width}px`
    pageWrapper.style.height = `${height}px`
    pageWrapper.style.marginBottom = `${pageGap}px`
  }

  /** 设置所有已挂载 base canvas 的鼠标样式。 */
  public setBaseCursor(cursor: string) {
    this.surfacePageStateList.forEach(state => {
      state.base?.canvas && (state.base.canvas.style.cursor = cursor)
    })
  }

  /** 创建临时 surface，供导出或测量链路短时占用。 */
  public createTransientSurface(options: IRenderSurfaceCreateOptions): IRenderSurface {
    const surface = this.createSurface({
      ...options,
      mounted: options.mounted ?? false,
      host: document.createElement('div')
    })
    this.transientSurfaceSet.add(surface)
    return surface
  }

  /** 获取或创建复用中的测量 surface。 */
  public getMeasureSurface(
    width: number,
    height: number,
    dpr: number
  ): IRenderSurface {
    if (this.measureSurface) {
      if (
        this.measureSurface.width !== width ||
        this.measureSurface.height !== height ||
        this.measureSurface.dpr !== dpr
      ) {
        this.resizeSurface(this.measureSurface, width, height, dpr)
      }
      return this.measureSurface
    }
    this.measureSurface = this.createSurface({
      pageNo: -1,
      layer: RenderLayer.MEASURE,
      host: document.createElement('div'),
      width,
      height,
      dpr,
      mounted: false
    })
    return this.measureSurface
  }

  /** 释放测量 surface，避免长期占用空闲 canvas。 */
  public releaseMeasureSurface() {
    if (!this.measureSurface) return
    this.releaseSurface(this.measureSurface)
    this.measureSurface = undefined
  }

  /** 释放所有 surface 及其池资源。 */
  public dispose() {
    this.releaseMeasureSurface()
    this.surfacePageStateList.forEach((state, pageNo) => {
      if (state?.base || state?.overlay) {
        this.unmountPage(pageNo)
      }
    })
    this.surfacePageStateList.length = 0
    this.transientSurfaceSet.forEach(surface => this.releaseSurface(surface))
    this.transientSurfaceSet.clear()
    this.bitmapCache.clear()
    this.bitmapCacheVersionMap.clear()
    this.bitmapCacheWriteSequenceMap.clear()
    this.canvasPool.dispose()
  }

  /** 释放临时 surface，并把资源归还 canvas 池。 */
  public releaseTransientSurface(surface: IRenderSurface) {
    this.transientSurfaceSet.delete(surface)
    this.releaseSurface(surface)
  }

  /** 将指定 surface 快照写入 bitmap 缓存。 */
  public async cacheSurfaceBitmap(
    surface: IRenderSurface,
    options: IRenderSurfaceBitmapCacheOptions = {}
  ): Promise<IBitmapCacheItem | undefined> {
    if (typeof createImageBitmap !== 'function') {
      return undefined
    }
    const version = this.getBitmapCacheVersion(surface)
    const writeSequence = this.nextBitmapCacheWriteSequence(surface)
    const bitmap = await createImageBitmap(surface.canvas)
    if (
      this.getBitmapCacheVersion(surface) !== version ||
      this.getBitmapCacheWriteSequence(surface) !== writeSequence
    ) {
      // 异步截图期间 surface 已被失效，必须关闭迟到的 bitmap 避免显存泄漏。
      this.bitmapCache.recordStaleDiscard(surface)
      bitmap.close()
      return undefined
    }
    this.bitmapCache.set({
      pageNo: surface.pageNo,
      layer: surface.layer,
      bitmap,
      width: surface.width,
      height: surface.height,
      dpr: surface.dpr,
      contentVersion: options.contentVersion,
      source: options.source
    })
    return this.bitmapCache.get({
      pageNo: surface.pageNo,
      layer: surface.layer
    })
  }

  /** 将外部 ImageBitmap 写入指定 surface 对应的 bitmap 缓存。 */
  public cacheImageBitmap(
    surface: IRenderSurface,
    bitmap: ImageBitmap,
    options: IRenderSurfaceBitmapCacheOptions = {}
  ): IBitmapCacheItem | undefined {
    this.bitmapCache.set({
      pageNo: surface.pageNo,
      layer: surface.layer,
      bitmap,
      width: surface.width,
      height: surface.height,
      dpr: surface.dpr,
      contentVersion: options.contentVersion,
      source: options.source
    })
    return this.bitmapCache.get({
      pageNo: surface.pageNo,
      layer: surface.layer
    })
  }

  /** 读取指定页指定层的 bitmap 缓存。 */
  public getBitmapCache(
    payload: IBitmapCacheKeyPayload
  ): IBitmapCacheItem | undefined {
    return this.bitmapCache.get(payload)
  }

  /** 将指定页指定层的 bitmap 缓存安全合成回目标 surface。 */
  public composeBitmapCacheToSurface(
    surface: IRenderSurface,
    options: IRenderSurfaceBitmapComposeOptions = {}
  ): boolean {
    const item = this.bitmapCache.get({
      pageNo: surface.pageNo,
      layer: surface.layer
    })
    if (!item) {
      return false
    }
    const rejectReason = this.getBitmapCacheComposeRejectReason(
      item,
      surface,
      options
    )
    if (rejectReason) {
      this.bitmapCache.recordComposeReject(rejectReason, surface)
      return false
    }
    const ctx = surface.ctx2d
    // 合成缓存前重置画布状态，避免业务绘制遗留的 transform 或透明度影响 bitmap。
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, surface.canvas.width, surface.canvas.height)
    ctx.drawImage(item.bitmap, 0, 0, surface.canvas.width, surface.canvas.height)
    ctx.restore()
    this.bitmapCache.recordComposeHit({
      pageNo: surface.pageNo,
      layer: surface.layer,
      source: item.source
    })
    return true
  }

  /** 删除指定页指定层的 bitmap 缓存。 */
  public deleteBitmapCache(payload: IBitmapCacheKeyPayload) {
    this.bitmapCache.delete(payload)
  }

  /** 使指定页指定层的 bitmap 缓存失效。 */
  public invalidateBitmapCache(payload: IBitmapCacheKeyPayload) {
    this.increaseBitmapCacheVersion(payload)
    this.bitmapCache.delete(payload)
  }

  /** 使指定页的所有 bitmap 缓存失效。 */
  public invalidatePageBitmapCache(pageNo: number) {
    Object.values(RenderLayer).forEach(layer => {
      this.increaseBitmapCacheVersion({ pageNo, layer })
    })
    this.bitmapCache.deletePage(pageNo)
  }

  /** 使所有 bitmap 缓存失效，通常用于布局或文档内容重算之后。 */
  public invalidateAllBitmapCache() {
    this.surfacePageStateList.forEach((_state, pageNo) => {
      Object.values(RenderLayer).forEach(layer => {
        this.increaseBitmapCacheVersion({ pageNo, layer })
      })
    })
    this.bitmapCache.clear()
  }

  /** 获取 canvas 池统计信息，供调试面板或性能验证使用。 */
  public getCanvasPoolStats() {
    return this.canvasPool.getStats()
  }

  /** 重置 surface / canvasPool / bitmapCache 统计，不释放现有资源。 */
  public resetStats() {
    this.peakEstimatedActiveBytes = this.getCurrentActiveEstimatedBytes()
    this.canvasPool.resetStats()
    this.bitmapCache.resetStats()
  }

  /** 获取 surface 管理器统计信息。 */
  public getStats(): IRenderSurfaceManagerStats {
    const mountedBasePageNoList: number[] = []
    const mountedOverlayPageNoList: number[] = []
    const mountedSurfaceList: IRenderSurface[] = []
    this.surfacePageStateList.forEach((state, pageNo) => {
      if (state.base) {
        mountedBasePageNoList.push(pageNo)
        mountedSurfaceList.push(state.base)
      }
      if (state.overlay) {
        mountedOverlayPageNoList.push(pageNo)
        mountedSurfaceList.push(state.overlay)
      }
    })
    const estimatedMountedBytes =
      this.getSurfaceListEstimatedBytes(mountedSurfaceList)
    const transientSurfaceList = Array.from(this.transientSurfaceSet)
    const estimatedTransientBytes =
      this.getSurfaceListEstimatedBytes(transientSurfaceList)
    const estimatedMeasureBytes = this.measureSurface
      ? this.getSurfaceEstimatedBytes(this.measureSurface)
      : 0
    const estimatedActiveBytes =
      estimatedMountedBytes + estimatedTransientBytes + estimatedMeasureBytes
    this.peakEstimatedActiveBytes = Math.max(
      this.peakEstimatedActiveBytes,
      estimatedActiveBytes
    )
    return {
      pageCount: this.surfacePageStateList.length,
      mountedBaseCount: mountedBasePageNoList.length,
      mountedOverlayCount: mountedOverlayPageNoList.length,
      hasMeasureSurface: Boolean(this.measureSurface),
      estimatedMountedBytes,
      estimatedMountedMB: this.toMB(estimatedMountedBytes),
      estimatedMountedBytesByLayer:
        this.getSurfaceEstimatedBytesByLayer(mountedSurfaceList),
      estimatedMeasureBytes,
      transientSurfaceCount: transientSurfaceList.length,
      estimatedTransientBytes,
      estimatedTransientMB: this.toMB(estimatedTransientBytes),
      estimatedTransientBytesByLayer:
        this.getSurfaceEstimatedBytesByLayer(transientSurfaceList),
      estimatedActiveBytes,
      estimatedActiveMB: this.toMB(estimatedActiveBytes),
      peakEstimatedActiveBytes: this.peakEstimatedActiveBytes,
      bitmapCache: this.bitmapCache.getStats(),
      mountedBasePageNoList,
      mountedOverlayPageNoList
    }
  }

  /** 创建指定页和层的 surface，并从 canvas 池申请实际资源。 */
  private createSurface(payload: {
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo: number
    /** 渲染图层标识，用于区分页背景、正文和浮层。 */
    layer: RenderLayer
    /** 宿主容器节点，用于承载编辑器或渲染表面。 */
    host: HTMLElement
    /** 宽度尺寸，使用编辑器内部像素单位。 */
    width: number
    /** 高度尺寸，使用编辑器内部像素单位。 */
    height: number
    /** 设备像素比，用于将 CSS 尺寸换算为画布像素。 */
    dpr: number
    /** mounted开关，用于控制当前流程的判断分支。 */
    mounted: boolean
  }): IRenderSurface {
    const { pageNo, layer, host, width, height, dpr, mounted } = payload
    const poolItem = this.canvasPool.acquire({
      layer,
      width,
      height,
      dpr,
      alpha: true
    })
    // 复用 canvas 时必须更新页码属性，避免命中测试读取旧页码。
    this.applyPageAttributes(poolItem.canvas, pageNo, layer)
    return {
      pageNo,
      layer,
      width,
      height,
      dpr,
      host,
      canvas: poolItem.canvas,
      ctx2d: poolItem.ctx,
      mounted
    }
  }

  /** 释放 surface 绑定资源。 */
  private releaseSurface(surface: IRenderSurface) {
    surface.mounted = false
    this.canvasPool.release({
      canvas: surface.canvas,
      ctx: surface.ctx2d,
      width: surface.width,
      height: surface.height,
      dpr: surface.dpr,
      layer: surface.layer,
      alpha: true
    })
  }

  /** 调整 surface 尺寸，并同步内部记录。 */
  private resizeSurface(
    surface: IRenderSurface,
    width: number,
    height: number,
    dpr: number
  ) {
    this.canvasPool.resize(
      {
        canvas: surface.canvas,
        ctx: surface.ctx2d,
        width: surface.width,
        height: surface.height,
        dpr: surface.dpr,
        layer: surface.layer,
        alpha: true
      },
      width,
      height,
      dpr
    )
    surface.width = width
    surface.height = height
    surface.dpr = dpr
  }

  /** 判断 surface 尺寸或 DPR 是否发生变化。 */
  private hasSurfaceSizeChanged(
    surface: IRenderSurface,
    width: number,
    height: number,
    dpr: number
  ): boolean {
    return surface.width !== width || surface.height !== height || surface.dpr !== dpr
  }

  /** 估算单个 surface backing store 占用字节数。 */
  private getSurfaceEstimatedBytes(surface: IRenderSurface): number {
    return surface.canvas.width * surface.canvas.height * 4
  }

  /** 估算多个 surface backing store 占用字节数。 */
  private getSurfaceListEstimatedBytes(surfaceList: IRenderSurface[]): number {
    return surfaceList.reduce(
      (total, surface) => total + this.getSurfaceEstimatedBytes(surface),
      0
    )
  }

  /** 估算当前活跃 surface backing store 总占用字节数。 */
  private getCurrentActiveEstimatedBytes(): number {
    const mountedSurfaceList: IRenderSurface[] = []
    this.surfacePageStateList.forEach(state => {
      if (state.base) {
        mountedSurfaceList.push(state.base)
      }
      if (state.overlay) {
        mountedSurfaceList.push(state.overlay)
      }
    })
    const measureBytes = this.measureSurface
      ? this.getSurfaceEstimatedBytes(this.measureSurface)
      : 0
    return (
      this.getSurfaceListEstimatedBytes(mountedSurfaceList) +
      this.getSurfaceListEstimatedBytes(Array.from(this.transientSurfaceSet)) +
      measureBytes
    )
  }

  /** 按 layer 估算多个 surface backing store 占用字节数。 */
  private getSurfaceEstimatedBytesByLayer(
    surfaceList: IRenderSurface[]
  ): Partial<Record<RenderLayer, number>> {
    return surfaceList.reduce<Partial<Record<RenderLayer, number>>>(
      (map, surface) => {
        map[surface.layer] =
          (map[surface.layer] ?? 0) + this.getSurfaceEstimatedBytes(surface)
        return map
      },
      {}
    )
  }

  /** 将字节数转换为 MB，保留两位小数。 */
  private toMB(bytes: number): number {
    return Math.round((bytes / 1024 / 1024) * 100) / 100
  }

  /** 获取 bitmap 缓存不能安全合成到目标 surface 的原因。 */
  private getBitmapCacheComposeRejectReason(
    item: IBitmapCacheItem,
    surface: IRenderSurface,
    options: IRenderSurfaceBitmapComposeOptions
  ): BitmapCacheComposeRejectReason | null {
    if (item.pageNo !== surface.pageNo) return 'page-no'
    if (item.layer !== surface.layer) return 'layer'
    if (item.width !== surface.width || item.height !== surface.height) {
      return 'size'
    }
    if (item.dpr !== surface.dpr) return 'dpr'
    if (item.contentVersion !== options.contentVersion) return 'content-version'
    if (
      item.bitmap.width !== surface.canvas.width ||
      item.bitmap.height !== surface.canvas.height
    ) {
      return 'bitmap-size'
    }
    return null
  }

  /** 获取 bitmap 缓存版本号。 */
  private getBitmapCacheVersion(payload: IBitmapCacheKeyPayload): number {
    return this.bitmapCacheVersionMap.get(this.getBitmapCacheVersionKey(payload)) ?? 0
  }

  /** 递增 bitmap 缓存版本号。 */
  private increaseBitmapCacheVersion(payload: IBitmapCacheKeyPayload) {
    const key = this.getBitmapCacheVersionKey(payload)
    this.bitmapCacheVersionMap.set(key, (this.bitmapCacheVersionMap.get(key) ?? 0) + 1)
  }

  /** 获取当前 bitmap 缓存写入序号。 */
  private getBitmapCacheWriteSequence(payload: IBitmapCacheKeyPayload): number {
    return this.bitmapCacheWriteSequenceMap.get(
      this.getBitmapCacheVersionKey(payload)
    ) ?? 0
  }

  /** 推进 bitmap 缓存写入序号，并返回本次异步写入凭证。 */
  private nextBitmapCacheWriteSequence(payload: IBitmapCacheKeyPayload): number {
    const key = this.getBitmapCacheVersionKey(payload)
    const nextSequence = (this.bitmapCacheWriteSequenceMap.get(key) ?? 0) + 1
    this.bitmapCacheWriteSequenceMap.set(key, nextSequence)
    return nextSequence
  }

  /** 获取 bitmap 缓存版本键。 */
  private getBitmapCacheVersionKey(payload: IBitmapCacheKeyPayload): string {
    return `${payload.layer}:${payload.pageNo}`
  }

  /** 更新 canvas 的页码属性和 layer 属性。 */
  private applyPageAttributes(
    canvas: HTMLCanvasElement,
    pageNo: number,
    layer: RenderLayer
  ) {
    if (layer === RenderLayer.BASE) {
      canvas.setAttribute('data-index', String(pageNo))
      canvas.removeAttribute('data-overlay-index')
    } else if (layer === RenderLayer.OVERLAY) {
      canvas.setAttribute('data-overlay-index', String(pageNo))
      canvas.removeAttribute('data-index')
    }
  }
}
