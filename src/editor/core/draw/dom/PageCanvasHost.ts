import { EDITOR_COMPONENT, EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { EditorComponent } from '../../../dataset/enum/Editor'
import {
  IBitmapCacheItem,
  IRenderSurface,
  IRenderSurfaceBitmapCacheOptions,
  IRenderSurfaceBitmapComposeOptions,
  RenderLayer,
  RenderSurfaceManager
} from '../../render-backend'

/** 页面画布hostmetrics契约，用于约束内部流程中传递的数据结构。 */
export interface IPageCanvasHostMetrics {
  getWidth(): number
  getHeight(): number
  getPageGap(): number
  getPagePixelRatio(): number
  onPageUnmount?(pageNo: number): void
}

export class PageCanvasHost {
  /** 单块 canvas 的最大物理高度，避免连页长文档撞浏览器 canvas 尺寸上限。 */
  private static readonly MAX_CANVAS_TILE_PHYSICAL_HEIGHT = 8192
  /** 页面阴影视觉；连页分块时阴影必须挂在 wrapper 上。 */
  private static readonly PAGE_SHADOW = 'rgb(158 161 165 / 40%) 0px 2px 12px 0px'
  /** 主容器元素，包含所有页面相关元素 */
  private container: HTMLDivElement
  /** 模态框宿主元素，用于放置弹窗等覆盖层 */
  private modalHost: HTMLDivElement
  /** 页面容器元素，包含所有页面包装器 */
  private pageContainer: HTMLDivElement
  /** 页面包装器列表，每个包装器包含一页的所有层 */
  private pageWrapperList: HTMLDivElement[]
  /** 页面自定义高度。连页模式会把第 0 页拉高，挂载 canvas 时必须沿用。 */
  private pageHeightOverrideList: Array<number | undefined>
  /** 覆盖层宿主列表，用于放置覆盖层画布 */
  private pageOverlayHostList: HTMLDivElement[]
  /** 渲染 surface 管理器，负责 canvas / ctx / pool 生命周期。 */
  private surfaceManager: RenderSurfaceManager
  /** 连页长文档的额外 canvas tile；首块仍由 surfaceManager 的 page surface 承载。 */
  private readonly layerTileSurfaceMap = new Map<string, IRenderSurface[]>()
  /**
   * 构造函数。
   *
   * @param rootContainer - 根容器元素，用于挂载编辑器
   * @param metrics - 页面画布宿主指标，提供尺寸和配置信息
   */
  constructor(
    rootContainer: HTMLElement,
    private readonly metrics: IPageCanvasHostMetrics
  ) {
    // 初始化所有数组
    this.pageWrapperList = []
    this.pageHeightOverrideList = []
    this.pageOverlayHostList = []
    this.surfaceManager = new RenderSurfaceManager(metrics)

    // 包装容器并格式化
    this.container = this._wrapContainer(rootContainer)
    this._formatContainer()
    // 创建模态框宿主和页面容器
    this.modalHost = this._createModalHost()
    this.pageContainer = this._createPageContainer()
    // 初始化至少一页
    this.setPageCount(1)
  }

  /**
   * 获取主容器元素。
   *
   * @returns 主容器元素
   */
  public getContainer(): HTMLDivElement {
    return this.container
  }

  /**
   * 获取模态框宿主元素。
   *
   * @returns 模态框宿主元素
   */
  public getModalHost(): HTMLDivElement {
    return this.modalHost
  }

  /**
   * 获取页面容器元素。
   *
   * @returns 页面容器元素
   */
  public getPageContainer(): HTMLDivElement {
    return this.pageContainer
  }

  /**
   * 获取指定页和指定层的渲染 surface。
   *
   * 后续渲染器应优先使用该入口，而不是直接读取 ctx 数组。
   *
   * @param pageNo - 页码
   * @param layer - 渲染层
   * @returns 渲染 surface，未挂载时返回 undefined
   */
  public getSurface(
    pageNo: number,
    layer: RenderLayer
  ): IRenderSurface | undefined {
    return this.surfaceManager.getSurface(pageNo, layer)
  }

  /**
   * 获取指定层的 surface 列表。
   *
   * 导出和批量渲染应优先使用该入口，避免重新依赖底层 canvas 数组。
   *
   * @param layer - 渲染层
   * @returns 按页码排序的 surface 列表
   */
  public getSurfaceList(layer: RenderLayer): (IRenderSurface | undefined)[] {
    return this.surfaceManager.getSurfaceList(layer)
  }

  /**
   * 获取指定页面的覆盖层宿主元素。
   *
   * @param pageNo - 页码
   * @returns 指定页面的覆盖层宿主元素
   */
  public getPageOverlayHost(pageNo: number): HTMLDivElement {
    return this.pageOverlayHostList[pageNo]
  }

  public getPageWrapperList(): HTMLDivElement[] {
    return this.pageWrapperList
  }

  /**
   * 获取所有页面的覆盖层宿主元素列表。
   *
   * @returns 覆盖层宿主元素列表
   */
  public getPageOverlayHostList(): HTMLDivElement[] {
    return this.pageOverlayHostList
  }

  /**
   * 获取页面数量。
   *
   * @returns 当前页面数量
   */
  public getPageCount(): number {
    return this.surfaceManager.getPageCount()
  }

  /**
   * 获取 canvas 池调试统计。
   *
   * 当前用于验证 canvas 复用命中率和空闲资源数量。
   *
   * @returns canvas 池统计信息
   */
  public getCanvasPoolStats() {
    return this.surfaceManager.getCanvasPoolStats()
  }

  /**
   * 获取 surface 管理器统计。
   *
   * 用于观察当前已挂载页面和测量 surface 状态。
   */
  public getSurfaceStats() {
    return this.surfaceManager.getStats()
  }

  /**
   * 重置渲染资源统计。
   *
   * 只清零统计计数，不释放 canvas、surface 或 bitmap 缓存，便于单场景压测。
   */
  public resetRenderResourceStats() {
    this.surfaceManager.resetStats()
  }

  /**
   * 获取测量专用渲染 surface。
   *
   * 该 surface 仅用于文本测量和布局计算，不挂载到页面 DOM。
   *
   * @param width - 测量 surface 宽度
   * @param height - 测量 surface 高度
   * @param dpr - 测量 surface 设备像素比
   * @returns 测量专用 surface
   */
  public getMeasureSurface(
    width = 1,
    height = 1,
    dpr = this.metrics.getPagePixelRatio()
  ): IRenderSurface {
    return this.surfaceManager.getMeasureSurface(width, height, dpr)
  }

  /**
   * 获取测量专用 2D 上下文。
   *
   * @param width - 测量 surface 宽度
   * @param height - 测量 surface 高度
   * @param dpr - 测量 surface 设备像素比
   * @returns 测量专用 2D 上下文
   */
  public getMeasureContext(
    width = 1,
    height = 1,
    dpr = this.metrics.getPagePixelRatio()
  ): CanvasRenderingContext2D {
    return this.getMeasureSurface(width, height, dpr).ctx2d
  }

  /**
   * 释放测量专用渲染 surface。
   *
   * 该入口主要用于销毁阶段，避免测量 surface 长期占用空闲池资源。
   */
  public releaseMeasureSurface() {
    this.surfaceManager.releaseMeasureSurface()
  }

  /**
   * 创建临时渲染 surface。
   *
   * 主要供导出和测量场景使用，不会挂载到页面 DOM。
   *
   * @param pageNo - 目标页码
   * @param layer - 目标渲染层
   * @param width - 临时 surface 宽度，默认使用当前页面宽度
   * @param height - 临时 surface 高度，默认使用当前页面高度
   * @param dpr - 临时 surface 设备像素比，默认使用当前页面像素比
   * @returns 临时 surface
   */
  public createTransientSurface(
    pageNo: number,
    layer: RenderLayer,
    width = this.metrics.getWidth(),
    height = this.metrics.getHeight(),
    dpr = this.metrics.getPagePixelRatio()
  ): IRenderSurface {
    return this.surfaceManager.createTransientSurface({
      pageNo,
      layer,
      width,
      height,
      dpr
    })
  }

  /**
   * 释放临时渲染 surface。
   *
   * @param surface - 待释放的临时 surface
   */
  public releaseTransientSurface(surface: IRenderSurface) {
    this.surfaceManager.releaseTransientSurface(surface)
  }

  /**
   * 将指定 surface 快照写入 bitmap 缓存。
   *
   * 当前仅提供缓存能力，不主动改变页面绘制路径。
   *
   * @param surface - 待缓存的 surface
   * @param options - 缓存写入选项
   * @returns 写入后的 bitmap 缓存项，不支持 ImageBitmap 时返回 undefined
   */
  public cacheSurfaceBitmap(
    surface: IRenderSurface,
    options?: IRenderSurfaceBitmapCacheOptions
  ): Promise<IBitmapCacheItem | undefined> {
    return this.surfaceManager.cacheSurfaceBitmap(surface, options)
  }

  /** 将 worker 返回的 ImageBitmap 写入指定 surface 的 bitmap 缓存。 */
  public cacheImageBitmap(
    surface: IRenderSurface,
    bitmap: ImageBitmap,
    options?: IRenderSurfaceBitmapCacheOptions
  ): IBitmapCacheItem | undefined {
    return this.surfaceManager.cacheImageBitmap(surface, bitmap, options)
  }

  /**
   * 读取指定页指定层的 bitmap 缓存。
   *
   * @param pageNo - 页码
   * @param layer - 渲染层
   * @returns bitmap 缓存项，未命中时返回 undefined
   */
  public getBitmapCache(pageNo: number, layer: RenderLayer) {
    return this.surfaceManager.getBitmapCache({ pageNo, layer })
  }

  /**
   * 将 bitmap 缓存安全合成回目标 surface。
   *
   * 该方法只做显式合成，不主动跳过业务渲染，调用方需要自行决定启用时机。
   *
   * @param surface - 目标渲染 surface
   * @param options - 缓存合成选项
   * @returns 合成成功返回 true，未命中或校验失败返回 false
   */
  public composeBitmapCacheToSurface(
    surface: IRenderSurface,
    options?: IRenderSurfaceBitmapComposeOptions
  ): boolean {
    return this.surfaceManager.composeBitmapCacheToSurface(surface, options)
  }

  /**
   * 删除指定页指定层的 bitmap 缓存。
   *
   * @param pageNo - 页码
   * @param layer - 渲染层
   */
  public deleteBitmapCache(pageNo: number, layer: RenderLayer) {
    this.surfaceManager.deleteBitmapCache({ pageNo, layer })
  }

  /**
   * 使指定页指定层的 bitmap 缓存失效。
   *
   * 渲染器在重绘某一层前应主动调用，避免后续读取旧缓存。
   *
   * @param pageNo - 页码
   * @param layer - 渲染层
   */
  public invalidateBitmapCache(pageNo: number, layer: RenderLayer) {
    this.surfaceManager.invalidateBitmapCache({ pageNo, layer })
  }

  /**
   * 使所有 bitmap 缓存失效。
   *
   * 通常在布局或文档内容重算后调用，避免旧内容版本继续占用内存。
   */
  public invalidateAllBitmapCache() {
    this.surfaceManager.invalidateAllBitmapCache()
  }

  /**
   * 销毁页面 canvas 宿主。
   *
   * 释放所有已挂载 surface、测量 surface 和 canvas 池空闲资源。
   */
  public dispose() {
    this.releaseAllLayerTileSurfaces()
    this.surfaceManager.dispose()
  }

  /**
   * 同步容器宽度。
   *
   * 根据指标中的宽度值更新容器宽度。
   */
  public syncContainerWidth() {
    // 根据指标设置容器宽度
    this.container.style.width = `${this.metrics.getWidth()}px`
  }

  /**
   * 设置基础光标样式。
   *
   * 为所有主画布设置统一的鼠标光标样式。
   *
   * @param cursor - 光标样式字符串
   */
  public setBaseCursor(cursor: string) {
    this.surfaceManager.setBaseCursor(cursor)
  }

  /**
   * 设置页面数量。
   *
   * 根据指定的数量创建或删除页面。
   *
   * @param count - 目标页面数量
   */
  public setPageCount(count: number) {
    while (this.pageWrapperList.length < count) {
      this._createPage(this.pageWrapperList.length)
    }
    // 如果当前页面数量多于目标数量，移除多余的页面
    while (this.pageWrapperList.length > count) {
      const pageNo = this.pageWrapperList.length - 1
      this.unmountCanvas(pageNo)
      const pageWrapper = this.pageWrapperList.pop()
      this.pageHeightOverrideList.pop()
      this.pageOverlayHostList.pop()
      this.releaseLayerTileSurfaces(pageNo)
      this.surfaceManager.removeLastPage()
      // 从 DOM 中移除页面包装器
      pageWrapper?.remove()
    }
  }

  /**
   * 同步所有页面的尺寸指标。
   *
   * 根据当前指标更新所有页面的尺寸。
   */
  public syncPageMetrics() {
    // 先同步容器宽度
    this.syncContainerWidth()
    // 同步基础页面指标时回到纸张高度；连页高度会在下一次布局后重新写入。
    this.pageHeightOverrideList = this.pageHeightOverrideList.map(() => undefined)
    // 页面度量变化后，测量 surface 需要重新申请，避免沿用旧尺寸缓存。
    this.releaseMeasureSurface()
    this.releaseAllLayerTileSurfaces()
    // 获取尺寸指标
    const width = this.metrics.getWidth()
    const height = this.metrics.getHeight()
    const dpr = this.metrics.getPagePixelRatio()
    const pageGap = this.metrics.getPageGap()
    for (let i = 0; i < this.pageWrapperList.length; i++) {
      if (this.surfaceManager.getSurface(i, RenderLayer.BASE)) {
        this._applyPageMetrics(i, width, height, dpr, pageGap)
      } else {
        const pageWrapper = this.pageWrapperList[i]
        const overlayHost = this.pageOverlayHostList[i]
        pageWrapper.style.width = `${width}px`
        pageWrapper.style.height = `${height}px`
        pageWrapper.style.marginBottom = `${pageGap}px`
        overlayHost.style.width = `${width}px`
        overlayHost.style.height = `${height}px`
      }
    }
  }

  /**
   * 调整指定页面的高度。
   *
   * @param pageNo - 页码
   * @param height - 新的高度值
   */
  public resizePageHeight(pageNo: number, height: number) {
    const nextHeight = Math.max(1, height)
    if (this.getPageHeight(pageNo) === nextHeight) {
      this.pageHeightOverrideList[pageNo] = nextHeight
      return
    }
    this.pageHeightOverrideList[pageNo] = nextHeight
    // 获取尺寸指标
    const width = this.metrics.getWidth()
    const dpr = this.metrics.getPagePixelRatio()
    const pageGap = this.metrics.getPageGap()
    if (this.surfaceManager.getSurface(pageNo, RenderLayer.BASE)) {
      this._applyPageMetrics(pageNo, width, nextHeight, dpr, pageGap)
    } else {
      const pageWrapper = this.pageWrapperList[pageNo]
      const overlayHost = this.pageOverlayHostList[pageNo]
      pageWrapper.style.height = `${nextHeight}px`
      pageWrapper.style.marginBottom = `${pageGap}px`
      overlayHost.style.height = `${nextHeight}px`
    }
  }

  /**
   * 调整连续页面的高度。
   *
   * 确保页面高度不小于最小高度。
   *
   * @param pageNo - 页码
   * @param pageHeight - 目标高度
   * @param minHeight - 最小高度
   */
  public resizeContinuousPage(pageNo: number, pageHeight: number, minHeight: number) {
    // 使用目标高度和最小高度中的较大值
    this.resizePageHeight(pageNo, Math.max(pageHeight, minHeight))
  }

  /**
   * 包装根容器。
   *
   * @param rootContainer - 根容器元素
   * @returns 包装后的容器元素
   */
  private _wrapContainer(rootContainer: HTMLElement): HTMLDivElement {
    // 创建容器并添加到根容器
    const container = document.createElement('div')
    rootContainer.append(container)
    return container
  }

  /**
   * 格式化容器样式。
   *
   * 设置容器的位置、宽度和属性标识。
   */
  private _formatContainer() {
    // 设置容器相对定位
    this.container.style.position = 'relative'
    // 根据指标设置容器宽度
    this.container.style.width = `${this.metrics.getWidth()}px`
    // 设置编辑器组件标识
    this.container.setAttribute(EDITOR_COMPONENT, EditorComponent.MAIN)
  }

  /**
   * 创建模态框宿主元素。
   *
   * @returns 模态框宿主元素
   */
  private _createModalHost(): HTMLDivElement {
    // 创建模态框宿主
    const modalHost = document.createElement('div')
    modalHost.style.position = 'relative'
    modalHost.style.zIndex = '1000'
    // 添加到容器
    this.container.append(modalHost)
    return modalHost
  }

  /**
   * 创建页面容器元素。
   *
   * @returns 页面容器元素
   */
  private _createPageContainer(): HTMLDivElement {
    // 创建页面容器
    const pageContainer = document.createElement('div')
    // 添加页面容器类名
    pageContainer.classList.add(`${EDITOR_PREFIX}-page-container`)
    // 添加到容器
    this.container.append(pageContainer)
    return pageContainer
  }

  /**
   * 创建页面包装器元素。
   *
   * 页面包装器是页面的容器，包含主画布、覆盖层画布等。
   *
   * @param pageNo - 页码
   * @returns 页面包装器元素
   */
  private _createPageWrapper(pageNo: number): HTMLDivElement {
    // 获取尺寸指标
    const width = this.metrics.getWidth()
    const height = this.metrics.getHeight()
    // 创建页面包装器
    const pageWrapper = document.createElement('div')
    pageWrapper.style.position = 'relative'
    pageWrapper.style.width = `${width}px`
    pageWrapper.style.height = `${height}px`
    // 设置页面间距
    pageWrapper.style.marginBottom = `${this.metrics.getPageGap()}px`
    // 设置页码数据属性
    pageWrapper.setAttribute('data-index', String(pageNo))
    // 添加到页面容器
    this.pageContainer.append(pageWrapper)
    // 保存到列表
    this.pageWrapperList.push(pageWrapper)
    return pageWrapper
  }

  /**
   * 创建页面覆盖层宿主元素。
   *
   * 覆盖层宿主用于放置覆盖层画布。
   *
   * @param pageWrapper - 页面包装器元素
   * @param pageNo - 页码
   * @returns 覆盖层宿主元素
   */
  private _createPageOverlayHost(
    pageWrapper: HTMLDivElement,
    pageNo: number
  ): HTMLDivElement {
    // 获取尺寸指标
    const width = this.metrics.getWidth()
    const height = this.metrics.getHeight()
    // 创建覆盖层宿主
    const overlayHost = document.createElement('div')
    overlayHost.style.position = 'absolute'
    overlayHost.style.left = '0'
    overlayHost.style.top = '0'
    overlayHost.style.width = `${width}px`
    overlayHost.style.height = `${height}px`
    overlayHost.style.zIndex = '2'
    // 不响应鼠标事件
    overlayHost.style.pointerEvents = 'none'
    // 设置覆盖层宿主索引数据属性
    overlayHost.setAttribute('data-overlay-host-index', String(pageNo))
    // 添加到页面包装器
    pageWrapper.append(overlayHost)
    // 保存到列表
    this.pageOverlayHostList.push(overlayHost)
    return overlayHost
  }

  /**
   * 创建页面。
   *
   * 为指定页码创建完整的页面结构，包括包装器、主画布和覆盖层画布。
   *
   * @param pageNo - 页码
   */
  private _createPage(pageNo: number) {
    // 创建页面包装器
    const pageWrapper = this._createPageWrapper(pageNo)
    // 在虚拟模式下，这仅仅是创建空壳 div
    this.surfaceManager.addPage()
    this.pageHeightOverrideList.push(undefined)
    // 创建覆盖层宿主
    this._createPageOverlayHost(pageWrapper, pageNo)
  }

  /**
   * 挂载指定页面的 Canvas。
   *
   * 将 Canvas 从池中取出并挂载到 pageWrapper 中，如果池为空则创建新的。
   *
   * @param pageNo - 页码
   */
  public mountCanvas(pageNo: number) {
    const pageWrapper = this.pageWrapperList[pageNo]
    if (!pageWrapper) return
    this.surfaceManager.mountPage({
      pageNo,
      pageWrapper
    })

    const width = this.metrics.getWidth()
    const height = this.getPageHeight(pageNo)
    const dpr = this.metrics.getPagePixelRatio()
    const pageGap = this.metrics.getPageGap()
    this._applyPageMetrics(pageNo, width, height, dpr, pageGap)
  }

  /**
   * 卸载指定页面的 Canvas。
   *
   * 从 pageWrapper 中移除 Canvas，并将其归还到画布池中。
   *
   * @param pageNo - 页码
   */
  public unmountCanvas(pageNo: number) {
    this.metrics.onPageUnmount?.(pageNo)
    this.releaseLayerTileSurfaces(pageNo)
    this.surfaceManager.unmountPage(pageNo)
  }

  /** 获取页面当前 CSS 逻辑高度。连页模式可能大于纸张高度。 */
  public getPageHeight(pageNo: number): number {
    return this.pageHeightOverrideList[pageNo] ?? this.metrics.getHeight()
  }

  /** 获取页面 wrapper 相对宿主容器顶部的 CSS 偏移。 */
  public getPageTop(pageNo: number): number {
    const pageWrapper = this.pageWrapperList[pageNo]
    if (!pageWrapper) {
      return pageNo * (this.metrics.getHeight() + this.metrics.getPageGap())
    }
    return pageWrapper.offsetTop
  }

  /**
   * 准备指定页 / 层的 canvas tile 列表。
   *
   * 普通页面只返回 surfaceManager 管理的首块 surface；连页长文档会额外挂载
   * 多块 transient surface，避免单个 canvas 过高导致浏览器裁剪或清空。
   */
  public prepareLayerTileSurfaces(
    pageNo: number,
    layer: RenderLayer
  ): IRenderSurface[] {
    const primarySurface = this.surfaceManager.getSurface(pageNo, layer)
    if (!primarySurface) {
      this.releaseLayerTileSurfaces(pageNo, layer)
      return []
    }
    const totalHeight = this.getPageHeight(pageNo)
    const width = this.metrics.getWidth()
    const dpr = this.metrics.getPagePixelRatio()
    const tileHeight = this.getCanvasTileCssHeight(totalHeight, dpr)
    primarySurface.offsetY = 0
    this.formatTileCanvas(primarySurface.canvas, layer, 0, 0)
    if (totalHeight <= tileHeight) {
      this.releaseLayerTileSurfaces(pageNo, layer)
      this.applyPageFrameShadow(pageNo, false)
      primarySurface.canvas.style.boxShadow = ''
      return [primarySurface]
    }

    const pageWrapper = this.pageWrapperList[pageNo]
    if (!pageWrapper) {
      this.releaseLayerTileSurfaces(pageNo, layer)
      return [primarySurface]
    }
    const tileCount = Math.ceil(totalHeight / tileHeight)
    this.applyPageFrameShadow(pageNo, true)
    primarySurface.canvas.style.boxShadow = 'none'
    const extraTileList = this.rebuildExtraLayerTileSurfaces({
      pageNo,
      layer,
      width,
      totalHeight,
      tileHeight,
      tileCount,
      dpr,
      pageWrapper
    })
    return [primarySurface, ...extraTileList]
  }

  /**
   * 应用页面尺寸指标。
   *
   * 更新指定页面的所有层和包装器的尺寸。
   *
   * @param pageNo - 页码
   * @param width - 宽度
   * @param height - 高度
   * @param dpr - 设备像素比
   * @param pageGap - 页面间距
   */
  private _applyPageMetrics(
    pageNo: number,
    width: number,
    height: number,
    dpr: number,
    pageGap: number
  ) {
    const overlayHost = this.pageOverlayHostList[pageNo]
    const pageWrapper = this.pageWrapperList[pageNo]
    const surfaceHeight = this.getCanvasTileCssHeight(height, dpr)

    this.surfaceManager.resizePage({
      pageNo,
      width,
      height,
      surfaceHeight,
      dpr,
      pageGap,
      pageWrapper,
      overlayHost
    })
  }

  private getCanvasTileCssHeight(totalHeight: number, dpr: number): number {
    const maxCssHeight = Math.max(
      1,
      Math.floor(
        PageCanvasHost.MAX_CANVAS_TILE_PHYSICAL_HEIGHT / Math.max(1, dpr)
      )
    )
    return Math.max(1, Math.min(totalHeight, maxCssHeight))
  }

  private rebuildExtraLayerTileSurfaces(payload: {
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo: number
    /** 渲染图层标识，用于区分页背景、正文和浮层。 */
    layer: RenderLayer
    /** 宽度尺寸，使用编辑器内部像素单位。 */
    width: number
    /** 分片绘制覆盖的总高度。 */
    totalHeight: number
    /** 单个分片画布的高度。 */
    tileHeight: number
    /** tilecount，用于统计当前场景的发生次数。 */
    tileCount: number
    /** 设备像素比，用于将 CSS 尺寸换算为画布像素。 */
    dpr: number
    pageWrapper: HTMLDivElement
  }): IRenderSurface[] {
    const { pageNo, layer, width, totalHeight, tileHeight, tileCount, dpr, pageWrapper } =
      payload
    this.releaseLayerTileSurfaces(pageNo, layer)
    const tileList: IRenderSurface[] = []
    for (let tileIndex = 1; tileIndex < tileCount; tileIndex++) {
      const offsetY = tileIndex * tileHeight
      const surfaceHeight = Math.max(1, Math.min(tileHeight, totalHeight - offsetY))
      const surface = this.surfaceManager.createTransientSurface({
        pageNo,
        layer,
        width,
        height: surfaceHeight,
        dpr,
        mounted: true
      })
      surface.offsetY = offsetY
      surface.host = pageWrapper
      this.formatTileCanvas(surface.canvas, layer, tileIndex, offsetY)
      surface.canvas.style.boxShadow = 'none'
      pageWrapper.append(surface.canvas)
      tileList.push(surface)
    }
    this.layerTileSurfaceMap.set(this.getLayerTileKey(pageNo, layer), tileList)
    return tileList
  }

  /** 格式化tile画布，生成界面显示或提交需要的文本。 */
  private formatTileCanvas(
    canvas: HTMLCanvasElement,
    layer: RenderLayer,
    tileIndex: number,
    offsetY: number
  ) {
    canvas.style.top = `${offsetY}px`
    this.clearCanvasFrameStyle(canvas)
    canvas.setAttribute('data-tile-index', String(tileIndex))
    if (layer === RenderLayer.BASE) {
      canvas.setAttribute('data-index', canvas.getAttribute('data-index') || '0')
      canvas.removeAttribute('data-overlay-index')
    } else if (layer === RenderLayer.OVERLAY) {
      canvas.setAttribute(
        'data-overlay-index',
        canvas.getAttribute('data-overlay-index') || '0'
      )
      canvas.removeAttribute('data-index')
    }
  }

  private releaseLayerTileSurfaces(pageNo: number, layer?: RenderLayer) {
    const layers = layer ? [layer] : [RenderLayer.BASE, RenderLayer.OVERLAY]
    layers.forEach(currentLayer => {
      const key = this.getLayerTileKey(pageNo, currentLayer)
      const tileList = this.layerTileSurfaceMap.get(key)
      if (!tileList) return
      tileList.forEach(surface => {
        this.surfaceManager.releaseTransientSurface(surface)
      })
      this.layerTileSurfaceMap.delete(key)
    })
  }

  private applyPageFrameShadow(pageNo: number, isTiled: boolean) {
    const pageWrapper = this.pageWrapperList[pageNo]
    if (!pageWrapper) return
    pageWrapper.style.backgroundColor = isTiled ? '#ffffff' : ''
    pageWrapper.style.boxShadow = isTiled ? PageCanvasHost.PAGE_SHADOW : ''
    pageWrapper.style.overflow = isTiled ? 'hidden' : ''
    if (isTiled) {
      this.clearPageCanvasFrameStyle(pageWrapper)
    }
  }

  private clearPageCanvasFrameStyle(pageWrapper: HTMLDivElement) {
    pageWrapper.querySelectorAll('canvas').forEach(canvas => {
      this.clearCanvasFrameStyle(canvas as HTMLCanvasElement)
    })
  }

  private clearCanvasFrameStyle(canvas: HTMLCanvasElement) {
    canvas.style.margin = '0'
    canvas.style.border = '0'
    canvas.style.outline = '0'
    canvas.style.boxShadow = 'none'
  }

  private releaseAllLayerTileSurfaces() {
    this.layerTileSurfaceMap.forEach(tileList => {
      tileList.forEach(surface => {
        this.surfaceManager.releaseTransientSurface(surface)
      })
    })
    this.layerTileSurfaceMap.clear()
  }

  private getLayerTileKey(pageNo: number, layer: RenderLayer): string {
    return `${layer}:${pageNo}`
  }
}
