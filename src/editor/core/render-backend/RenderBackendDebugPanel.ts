/** 渲染backenddebugsnapshot契约，用于约束内部流程中传递的数据结构。 */
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
    /** 分发次数，用于统计渲染任务进入调度器的频率。 */
    dispatchCount: number
    /** 渲染次数，用于统计实际绘制执行频率。 */
    renderCount: number
    /** 缓存未命中次数，用于评估缓存缺口。 */
    missCount: number
    /** 失败次数，用于统计渲染或优化路径异常。 */
    failureCount: number
    /** 降级路径次数，用于统计切换到 Canvas2D 渲染的频率。 */
    failoverCount: number
    /** slowcount，用于统计当前场景的发生次数。 */
    slowCount: number
    /** 渲染能力列表，记录当前环境可使用的后端特性。 */
    capabilityList: unknown[]
  }
  /** worker 后台绘制队列状态。 */
  worker: {
    /** 提交次数，用于统计渲染任务进入后台执行的频率。 */
    submitCount: number
    /** 成功次数，用于统计渲染任务完成情况。 */
    successCount: number
    /** 降级路径次数，用于统计切换到 Canvas2D 渲染的频率。 */
    failoverCount: number
    /** 待处理count，用于统计当前场景的发生次数。 */
    pendingCount: number
    /** 正在执行的任务数量，用于观察后台渲染并发。 */
    activeCount: number
    /** 排队任务数量，用于观察渲染调度积压。 */
    queuedCount: number
    /** 熔断状态，用于暂停不稳定的异步渲染路径。 */
    circuitOpen: boolean
    /** 最近一次降级路径原因，用于诊断渲染后端切换。 */
    lastFailoverReason: string
  }
  /** base 渲染来源状态。 */
  baseRenderSource: {
    /** Canvas 2D 渲染次数，用于对比后端渲染路径占比。 */
    canvas2DRenderCount: number
    /** 后台线程渲染count，用于统计当前场景的发生次数。 */
    workerRenderCount: number
    /** 位图缓存合成次数，用于观察缓存复用效果。 */
    bitmapCacheComposeCount: number
  }
  /** 输入态局部预览状态。 */
  typingPreview: {
    /** 尝试次数，用于统计优化路径被触发的频率。 */
    attemptCount: number
    /** 补丁成功次数，用于评估增量渲染命中效果。 */
    patchSuccessCount: number
    /** 行级补丁成功次数，用于评估局部渲染效果。 */
    linePatchSuccessCount: number
    /** 失败次数，用于统计渲染或优化路径异常。 */
    failureCount: number
  }
  /** 图片任务收益与缓存状态。 */
  image: {
    /** 预览缓存命中率，用于评估图片预览复用效果。 */
    previewCacheHitRate: number
    /** 预览缓存占用估算值，单位 MB。 */
    previewCacheEstimatedMB: number
    /** WebGL 纹理缓存占用估算值，单位 MB。 */
    webglTextureCacheMB: number
    /** WebGL 纹理缓存上限，单位 MB。 */
    webglMaxTextureCacheMB: number
    /** 降采样节省的像素估算值，用于评估图片优化收益。 */
    estimatedDownsampleSavedPixels: number
    /** 节省的上传像素数，用于评估 WebGL 纹理上传优化。 */
    savedUploadPixels: number
  }
  /** 总体内存预算状态。 */
  memory: {
    /** 渲染后端总内存估算值，单位 MB。 */
    estimatedTotalMB: number
    /** 当前活跃渲染面的显存估算值，单位 MB。 */
    activeSurfaceMB: number
    /** 位图缓存占用估算值，单位 MB。 */
    bitmapCacheMB: number
    /** 图片预览位图占用估算值，单位 MB。 */
    imagePreviewBitmapMB: number
    /** 空闲画布池占用估算值，单位 MB。 */
    idleCanvasPoolMB: number
  }
  /** 正文数据结构 mirror 试点状态。 */
  documentTextStore: {
    type: string
    /** 数据长度，用于描述队列、文本或操作序列规模。 */
    length: number
    /** 操作数量，用于描述快照或补丁中的变更规模。 */
    operationCount: number
    /** 外部变更次数，用于判断镜像状态是否被外部改写。 */
    externalMutationCount: number
    /** 镜像模式，用于控制调试状态是否启用回放校验。 */
    mirrorMode: string
    /** 镜像状态是否健康，用于判断回放校验是否通过。 */
    mirrorHealthy: boolean
    /** 镜像回放次数，用于统计调试校验执行频率。 */
    mirrorReplayCount: number
    /** 镜像回放不一致次数，用于定位状态同步问题。 */
    mirrorReplayMismatchCount: number
    /** 镜像回放跳过次数，用于记录无法校验的场景。 */
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
