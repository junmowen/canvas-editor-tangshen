import { EDITOR_COMPONENT, EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { EditorComponent } from '../../../dataset/enum/Editor'

export interface IPageCanvasHostMetrics {
  getWidth(): number
  getHeight(): number
  getPageGap(): number
  getPagePixelRatio(): number
}

export interface IPageCanvasHostState {
  pageContainer: HTMLDivElement
  pageWrapperList: HTMLDivElement[]
  pageList: HTMLCanvasElement[]
  overlayPageList: HTMLCanvasElement[]
  pageOverlayHostList: HTMLDivElement[]
  ctxList: CanvasRenderingContext2D[]
  overlayCtxList: CanvasRenderingContext2D[]
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
  /** 主画布列表，用于绘制页面内容 */
  private pageList: HTMLCanvasElement[]
  /** 覆盖层画布列表，用于绘制临时内容（如光标、选区） */
  private overlayPageList: HTMLCanvasElement[]
  /** 覆盖层宿主列表，用于放置覆盖层画布 */
  private pageOverlayHostList: HTMLDivElement[]
  /** 主画布上下文列表 */
  private ctxList: CanvasRenderingContext2D[]
  /** 覆盖层画布上下文列表 */
  private overlayCtxList: CanvasRenderingContext2D[]
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
    this.pageList = []
    this.overlayPageList = []
    this.pageOverlayHostList = []
    this.ctxList = []
    this.overlayCtxList = []

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
   * 获取指定页面的主画布。
   *
   * @param pageNo - 页码
   * @returns 指定页面的主画布
   */
  public getPage(pageNo: number): HTMLCanvasElement {
    return this.pageList[pageNo]
  }

  /**
   * 获取指定页面的覆盖层画布。
   *
   * @param pageNo - 页码
   * @returns 指定页面的覆盖层画布
   */
  public getOverlayPage(pageNo: number): HTMLCanvasElement {
    return this.overlayPageList[pageNo]
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

  /**
   * 获取所有页面的主画布列表。
   *
   * @returns 主画布列表
   */
  public getPageList(): HTMLCanvasElement[] {
    return this.pageList
  }

  /**
   * 获取所有页面的覆盖层画布列表。
   *
   * @returns 覆盖层画布列表
   */
  public getOverlayPageList(): HTMLCanvasElement[] {
    return this.overlayPageList
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
   * 获取所有主画布的上下文列表。
   *
   * @returns 主画布上下文列表
   */
  public getCtxList(): CanvasRenderingContext2D[] {
    return this.ctxList
  }

  /**
   * 获取所有覆盖层画布的上下文列表。
   *
   * @returns 覆盖层画布上下文列表
   */
  public getOverlayCtxList(): CanvasRenderingContext2D[] {
    return this.overlayCtxList
  }

  /**
   * 获取页面数量。
   *
   * @returns 当前页面数量
   */
  public getPageCount(): number {
    return this.pageList.length
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
    // 为每个主画布设置光标样式
    this.pageList.forEach(page => {
      page.style.cursor = cursor
    })
  }

  /**
   * 设置页面数量。
   *
   * 根据指定的数量创建或删除页面。
   *
   * @param count - 目标页面数量
   */
  public setPageCount(count: number) {
    // 如果当前页面数量少于目标数量，创建新页面
    while (this.pageList.length < count) {
      this._createPage(this.pageList.length)
    }
    // 如果当前页面数量多于目标数量，移除多余的页面
    while (this.pageList.length > count) {
      const pageWrapper = this.pageWrapperList.pop()
      this.pageList.pop()
      this.overlayPageList.pop()
      this.pageOverlayHostList.pop()
      this.ctxList.pop()
      this.overlayCtxList.pop()
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
    // 获取尺寸指标
    const width = this.metrics.getWidth()
    const height = this.metrics.getHeight()
    const dpr = this.metrics.getPagePixelRatio()
    const pageGap = this.metrics.getPageGap()
    // 为每个页面应用新的尺寸指标
    for (let i = 0; i < this.pageList.length; i++) {
      this._applyPageMetrics(i, width, height, dpr, pageGap)
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
    // 应用新的高度到指定页面
    this._applyPageMetrics(pageNo, width, height, dpr, pageGap)
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
   * 捕获当前页面画布宿主状态。
   *
   * 用于导出或状态恢复。
   *
   * @returns 页面画布宿主状态对象
   */
  public captureState(): IPageCanvasHostState {
    return {
      pageContainer: this.pageContainer,
      pageWrapperList: this.pageWrapperList,
      pageList: this.pageList,
      overlayPageList: this.overlayPageList,
      pageOverlayHostList: this.pageOverlayHostList,
      ctxList: this.ctxList,
      overlayCtxList: this.overlayCtxList
    }
  }

  /**
   * 替换为分离状态。
   *
   * 创建新的空白状态，用于导出场景。
   */
  public replaceWithDetachedState() {
    // 创建新的空白页面容器
    this.pageContainer = document.createElement('div')
    // 清空所有数组
    this.pageWrapperList = []
    this.pageList = []
    this.overlayPageList = []
    this.pageOverlayHostList = []
    this.ctxList = []
    this.overlayCtxList = []
  }

  /**
   * 恢复页面画布宿主状态。
   *
   * @param state - 之前捕获的状态对象
   */
  public restoreState(state: IPageCanvasHostState) {
    this.pageContainer = state.pageContainer
    this.pageWrapperList = state.pageWrapperList
    this.pageList = state.pageList
    this.overlayPageList = state.overlayPageList
    this.pageOverlayHostList = state.pageOverlayHostList
    this.ctxList = state.ctxList
    this.overlayCtxList = state.overlayCtxList
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
   * 创建图层画布。
   *
   * 创建主画布或覆盖层画布，根据参数决定。
   *
   * @param pageWrapper - 页面包装器元素
   * @param pageNo - 页码
   * @param isOverlay - 是否为覆盖层画布，默认为 false
   * @returns 画布和上下文对象
   */
  private _createLayerCanvas(
    pageWrapper: HTMLDivElement,
    pageNo: number,
    isOverlay = false
  ) {
    // 获取尺寸指标
    const width = this.metrics.getWidth()
    const height = this.metrics.getHeight()
    // 创建画布
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.style.display = 'block'
    // 设置层级：覆盖层在上，主画布在下
    canvas.style.zIndex = isOverlay ? '1' : '0'
    // 设置背景色：覆盖层透明，主画布白色
    canvas.style.backgroundColor = isOverlay ? 'transparent' : '#ffffff'
    // 覆盖层不响应鼠标事件，主画布响应
    canvas.style.pointerEvents = isOverlay ? 'none' : 'auto'
    if (isOverlay) {
      // 覆盖层画布标识
      canvas.setAttribute('data-layer', 'overlay')
      canvas.setAttribute('data-overlay-index', String(pageNo))
      pageWrapper.append(canvas)
    } else {
      // 主画布标识
      canvas.setAttribute('data-layer', 'base')
      canvas.setAttribute('data-index', String(pageNo))
      // 主画布使用文本光标
      canvas.style.cursor = 'text'
      pageWrapper.append(canvas)
    }
    // 根据设备像素比设置实际尺寸
    const dpr = this.metrics.getPagePixelRatio()
    canvas.width = width * dpr
    canvas.height = height * dpr
    // 获取画布上下文
    const ctx = canvas.getContext('2d')!
    // 初始化画布上下文
    this._initPageContext(ctx)
    return {
      canvas,
      ctx
    }
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
    // 创建主画布
    const { canvas, ctx } = this._createLayerCanvas(pageWrapper, pageNo)
    // 创建覆盖层画布
    const { canvas: overlayCanvas, ctx: overlayCtx } = this._createLayerCanvas(
      pageWrapper,
      pageNo,
      true
    )
    // 保存主画布到列表
    this.pageList.push(canvas)
    this.ctxList.push(ctx)
    // 保存覆盖层画布到列表
    this.overlayPageList.push(overlayCanvas)
    this.overlayCtxList.push(overlayCtx)
    // 创建覆盖层宿主
    this._createPageOverlayHost(pageWrapper, pageNo)
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
    // 获取页面的各层元素
    const page = this.pageList[pageNo]
    const overlayPage = this.overlayPageList[pageNo]
    const overlayHost = this.pageOverlayHostList[pageNo]
    const pageWrapper = this.pageWrapperList[pageNo]

    // 更新主画布的实际尺寸和显示尺寸
    page.width = width * dpr
    page.height = height * dpr
    page.style.width = `${width}px`
    page.style.height = `${height}px`
    // 重新初始化主画布上下文
    this._initPageContext(this.ctxList[pageNo])

    // 更新覆盖层画布的实际尺寸和显示尺寸
    overlayPage.width = width * dpr
    overlayPage.height = height * dpr
    overlayPage.style.width = `${width}px`
    overlayPage.style.height = `${height}px`
    // 重新初始化覆盖层画布上下文
    this._initPageContext(this.overlayCtxList[pageNo])

    // 更新覆盖层宿主尺寸
    overlayHost.style.width = `${width}px`
    overlayHost.style.height = `${height}px`

    // 更新页面包装器尺寸和间距
    pageWrapper.style.width = `${width}px`
    pageWrapper.style.height = `${height}px`
    pageWrapper.style.marginBottom = `${pageGap}px`
  }

  /**
   * 初始化页面画布上下文。
   *
   * 设置画布的基本属性，包括缩放、字间距、词间距和方向。
   *
   * @param ctx - 画布上下文
   */
  private _initPageContext(ctx: CanvasRenderingContext2D) {
    // 根据设备像素比设置缩放
    const dpr = this.metrics.getPagePixelRatio()
    ctx.scale(dpr, dpr)
    // 设置字间距和词间距
    ctx.letterSpacing = '0px'
    ctx.wordSpacing = '0px'
    // 设置文本方向为从左到右
    ctx.direction = 'ltr'
  }
}
