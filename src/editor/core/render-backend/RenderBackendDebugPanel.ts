/** 渲染后端调试快照，用于测试、业务调试面板和性能压测统一读取。 */
export interface IRenderBackendDebugSnapshot {
  /** 当前文档页数。 */
  pageCount: number
  /** 当前可视页列表。 */
  visiblePageNoList: number[]
  /** 当前交叉观察页。 */
  intersectionPageNo: number
  /** 当前页码。 */
  currentPageNo: number
  /** 渲染后端关键状态。 */
  backend: {
    dispatchCount: number
    renderCount: number
    missCount: number
    failureCount: number
    fallbackCount: number
    slowCount: number
    capabilityList: unknown[]
  }
  /** worker 后台绘制队列状态。 */
  worker: {
    submitCount: number
    successCount: number
    fallbackCount: number
    pendingCount: number
    activeCount: number
    queuedCount: number
    circuitOpen: boolean
    lastFallbackReason: string
  }
  /** base 渲染来源状态。 */
  baseRenderSource: {
    canvas2DRenderCount: number
    workerRenderCount: number
    bitmapCacheComposeCount: number
  }
  /** 输入态局部预览状态。 */
  typingPreview: {
    attemptCount: number
    patchSuccessCount: number
    linePatchSuccessCount: number
    failureCount: number
  }
  /** 图片任务收益与缓存状态。 */
  image: {
    previewCacheHitRate: number
    previewCacheEstimatedMB: number
    webglTextureCacheMB: number
    webglMaxTextureCacheMB: number
    estimatedDownsampleSavedPixels: number
    savedUploadPixels: number
  }
  /** 总体内存预算状态。 */
  memory: {
    estimatedTotalMB: number
    activeSurfaceMB: number
    bitmapCacheMB: number
    imagePreviewBitmapMB: number
    idleCanvasPoolMB: number
  }
  /** 正文数据结构 mirror 试点状态。 */
  documentTextStore: {
    type: string
    length: number
    operationCount: number
    externalMutationCount: number
    mirrorMode: string
    mirrorHealthy: boolean
    mirrorReplayCount: number
    mirrorReplayMismatchCount: number
    mirrorReplaySkippedCount: number
  }
}

/** 渲染后端调试面板，默认关闭，只在配置开启后挂载只读状态。 */
export class RenderBackendDebugPanel {
  /** 面板根节点。 */
  private element: HTMLDivElement | null = null

  /**
   * @param container - 编辑器容器
   * @param getSnapshot - 获取最新调试快照
   */
  constructor(
    private readonly container: HTMLElement,
    private readonly getSnapshot: () => IRenderBackendDebugSnapshot
  ) {}

  /** 更新面板内容，首次调用时惰性创建 DOM。 */
  public update() {
    const snapshot = this.getSnapshot()
    const element = this.ensureElement()
    element.textContent = [
      `pages ${snapshot.pageCount}`,
      `backend ${snapshot.backend.renderCount}/${snapshot.backend.dispatchCount}`,
      `worker ${snapshot.worker.successCount}/${snapshot.worker.submitCount}`,
      `cache ${snapshot.baseRenderSource.bitmapCacheComposeCount}`,
      `mem ${snapshot.memory.estimatedTotalMB}MB`,
      `mirror ${snapshot.documentTextStore.mirrorHealthy ? 'ok' : 'bad'}`
    ].join(' | ')
    element.dataset.backendRenderCount = String(snapshot.backend.renderCount)
    element.dataset.workerSuccessCount = String(snapshot.worker.successCount)
    element.dataset.memoryMb = String(snapshot.memory.estimatedTotalMB)
    element.dataset.mirrorHealthy = String(
      snapshot.documentTextStore.mirrorHealthy
    )
  }

  /** 移除面板 DOM。 */
  public destroy() {
    this.element?.remove()
    this.element = null
  }

  /** 惰性创建面板 DOM。 */
  private ensureElement(): HTMLDivElement {
    if (this.element) {
      return this.element
    }
    const element = document.createElement('div')
    element.className = 'ce-render-backend-debug-panel'
    element.dataset.renderBackendDebugPanel = 'true'
    this.container.append(element)
    this.element = element
    return element
  }
}
