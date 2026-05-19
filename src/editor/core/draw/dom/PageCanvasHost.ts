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

export interface IPageCanvasHostMetrics {
  getWidth(): number
  getHeight(): number
  getPageGap(): number
  getPagePixelRatio(): number
  onPageUnmount?(pageNo: number): void
}

export class PageCanvasHost {
  /** 主容器元素，包含所有页面相关元素 */
  private container: HTMLDivElement
  /** 模态框宿主元素，用于放置弹窗等覆盖层 */
  private modalHost: HTMLDivElement
  /** 页面容器元素，包含所有页面包装器 */
  private pageContainer: HTMLDivElement
  /** 页面包装器列表，每个包装器包含一页的所有层 */
  private pageWrapperList: HTMLDivElement[]
  /** 覆盖层宿主列表，用于放置覆盖层画布 */
  private pageOverlayHostList: HTMLDivElement[]
  /** 渲染 surface 管理器，负责 canvas / ctx / pool 生命周期。 */
  private surfaceManager: RenderSurfaceManager
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
   * 导出和批量渲染应优先使用该入口，避免重新依赖兼容 canvas 数组。
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
      this.pageOverlayHostList.pop()
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
    // 页面度量变化后，测量 surface 需要重新申请，避免沿用旧尺寸缓存。
    this.releaseMeasureSurface()
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
    // 获取尺寸指标
    const width = this.metrics.getWidth()
    const dpr = this.metrics.getPagePixelRatio()
    const pageGap = this.metrics.getPageGap()
    if (this.surfaceManager.getSurface(pageNo, RenderLayer.BASE)) {
      this._applyPageMetrics(pageNo, width, height, dpr, pageGap)
    } else {
      const pageWrapper = this.pageWrapperList[pageNo]
      const overlayHost = this.pageOverlayHostList[pageNo]
      pageWrapper.style.height = `${height}px`
      pageWrapper.style.marginBottom = `${pageGap}px`
      overlayHost.style.height = `${height}px`
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
    const height = this.metrics.getHeight()
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
    this.surfaceManager.unmountPage(pageNo)
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

    this.surfaceManager.resizePage({
      pageNo,
      width,
      height,
      dpr,
      pageGap,
      pageWrapper,
      overlayHost
    })
  }
}
