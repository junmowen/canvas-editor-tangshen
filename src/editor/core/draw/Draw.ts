import {
  IAppendElementListOption,
  IComputeRowListPayload,
  IDrawOption,
  IDrawRowPayload,
  IGetImageOption,
  IGetOriginValueOption,
  IGetValueOption,
  IPainterOption
} from '../../interface/Draw'
import {
  IEditorData,
  IEditorOption,
  IEditorResult,
  ISetValueOption
} from '../../interface/Editor'
import {
  IElement,
  IElementStyle,
  ISpliceElementListOption,
  IInsertElementListOption
} from '../../interface/Element'
import { IRow } from '../../interface/Row'
import { Cursor } from '../cursor/Cursor'
import { HistoryManager } from '../history/HistoryManager'
import { Listener } from '../listener/Listener'
import { Position } from '../position/Position'
import { RangeManager } from '../range/RangeManager'
import { Background } from './frame/Background'
import { Highlight } from './richtext/Highlight'
import { Margin } from './frame/Margin'
import { Search } from './interactive/Search'
import { Strikeout } from './richtext/Strikeout'
import { Underline } from './richtext/Underline'
import { ImageParticle } from './particle/ImageParticle'
import { LaTexParticle } from './particle/latex/LaTexParticle'
import { TextParticle } from './particle/TextParticle'
import { PageNumber } from './frame/PageNumber'
import { TableParticle } from './particle/table/TableParticle'
import { HyperlinkParticle } from './particle/HyperlinkParticle'
import { Header } from './frame/Header'
import { SuperscriptParticle } from './particle/SuperscriptParticle'
import { SubscriptParticle } from './particle/SubscriptParticle'
import { SeparatorParticle } from './particle/SeparatorParticle'
import { PageBreakParticle } from './particle/PageBreakParticle'
import { Watermark } from './frame/Watermark'
import {
  EditorMode,
  PageMode,
  PaperDirection
} from '../../dataset/enum/Editor'
import { Control } from './control/Control'
import { CheckboxParticle } from './particle/CheckboxParticle'
import { RadioParticle } from './particle/RadioParticle'
import { DeepRequired, IPadding } from '../../interface/Common'
import { DateParticle } from './particle/date/DateParticle'
import { IMargin } from '../../interface/Margin'
import { BlockParticle } from './particle/block/BlockParticle'
import { I18n } from '../i18n/I18n'
import { ImageObserver } from '../observer/ImageObserver'
import { Zone } from '../zone/Zone'
import { Footer } from './frame/Footer'
import { ListParticle } from './particle/ListParticle'
import { Placeholder } from './frame/Placeholder'
import { EventBus } from '../event/eventbus/EventBus'
import { EventBusMap } from '../../interface/EventBus'
import { Group } from './interactive/Group'
import { Override } from '../override/Override'
import { LineBreakParticle } from './particle/LineBreakParticle'
import { LineNumber } from './frame/LineNumber'
import { PageBorder } from './frame/PageBorder'
import { ITd } from '../../interface/table/Td'
import { Area } from './interactive/Area'
import { Badge } from './frame/Badge'
import { TableLayoutSnapshotAccessor } from '../table/layout/TableLayoutSnapshotAccessor'
import { TableOverlayRenderer } from '../table/render/TableOverlayRenderer'
import { ITableLayoutSnapshot } from '../table/layout/TableLayoutSnapshotTypes'
import { TableHitTestService } from '../table/hittest/TableHitTestService'
import { PageCanvasHost } from './dom/PageCanvasHost'
import { DrawViewState } from './state/DrawViewState'
import { createDocumentTextStoreElementSignature } from './data/DocumentTextStore'
import {
  IRenderBackendDebugSnapshot,
  RenderBackendDebugPanel
} from '../render-backend/RenderBackendDebugPanel'
import { DrawRuntime } from './runtime/DrawRuntime'
import { DrawComponentRegistry } from './runtime/DrawComponentRegistry'
import { DrawServiceRegistry } from './runtime/DrawServiceRegistry'
import { IPointerCoordinatePayload } from '../event/pointer/coordinates/PointerCoordinateTypes'
import { TrackChangeService } from './track-change/TrackChangeService'

export class Draw {
  private runtime: DrawRuntime
  private components: DrawComponentRegistry
  private services: DrawServiceRegistry
  private pageCanvasHost: PageCanvasHost
  private viewState: DrawViewState
  private bootstrapHistoryManager?: HistoryManager
  private bootstrapPosition?: Position
  private bootstrapZone?: Zone
  private bootstrapRange?: RangeManager
  private bootstrapHeader?: Header
  private bootstrapFooter?: Footer
  private bootstrapTableParticle?: TableParticle
  private bootstrapHyperlinkParticle?: HyperlinkParticle
  private bootstrapDateParticle?: DateParticle
  private bootstrapImageParticle?: ImageParticle
  private bootstrapControl?: Control
  private bootstrapCursor?: Cursor
  private bootstrapTableHitTestService?: TableHitTestService
  private listener: Listener
  private eventBus: EventBus<EventBusMap>
  private override: Override
  private renderBackendDebugPanel: RenderBackendDebugPanel | null = null

  private LETTER_REG: RegExp
  private WORD_LIKE_REG: RegExp

  constructor(
    rootContainer: HTMLElement,
    options: DeepRequired<IEditorOption>,
    data: IEditorData,
    listener: Listener,
    eventBus: EventBus<EventBusMap>,
    override: Override
  ) {
    this.runtime = new DrawRuntime(options, data)
    this.listener = listener
    this.eventBus = eventBus
    this.override = override
    this.viewState = new DrawViewState(listener, eventBus, options)
    const bootstrapI18n = new I18n(options.locale)
    this.services = new DrawServiceRegistry(this)

    this.pageCanvasHost = new PageCanvasHost(rootContainer, {
      getWidth: () => this.getWidth(),
      getHeight: () => this.getHeight(),
      getPageGap: () => this.getPageGap(),
      getPagePixelRatio: () => this.getPagePixelRatio(),
      onPageUnmount: pageNo => {
        this.components?.blockParticle.clearPage(pageNo)
      }
    })

    this.components = new DrawComponentRegistry(
      this,
      data,
      bootstrapI18n
    )

    const { letterClass } = options
    this.LETTER_REG = new RegExp(`[${letterClass.join('')}]`)
    this.WORD_LIKE_REG = new RegExp(
      `${letterClass.map(letter => `[^${letter}][${letter}]`).join('|')}`
    )
    // 打印模式优先设置打印数据
    if (this.getMode() === EditorMode.PRINT) {
      this.setPrintData()
    }
    this.render({
      isInit: true,
      isSetCursor: false,
      isFirstRender: true
    })
  }

  // 设置打印数据
  public setPrintData() {
    this.flushAsyncInsertTransaction('set-print-data')
    this.services.exportService.setPrintData()
  }

  // 还原打印数据
  public clearPrintData() {
    this.services.exportService.clearPrintData()
  }

  public getLetterReg(): RegExp {
    return this.LETTER_REG
  }

  public getMode(): EditorMode {
    return this.runtime.getMode()
  }

  public setMode(payload: EditorMode) {
    this.services.pageSetupService.setMode(payload)
  }

  public isReadonly() {
    return this.services.stateQueryService.isReadonly()
  }

  public isDisabled() {
    return this.services.stateQueryService.isDisabled()
  }

  public isDesignMode() {
    return this.services.stateQueryService.isDesignMode()
  }

  public isPrintMode() {
    return this.services.stateQueryService.isPrintMode()
  }

  public getOriginalWidth(): number {
    if (!this.services?.metricsService) {
      const { paperDirection, width, height } = this.runtime.getOptions()
      return paperDirection === PaperDirection.VERTICAL ? width : height
    }
    return this.services.metricsService.getOriginalWidth()
  }

  public getOriginalHeight(): number {
    if (!this.services?.metricsService) {
      const { paperDirection, width, height } = this.runtime.getOptions()
      return paperDirection === PaperDirection.VERTICAL ? height : width
    }
    return this.services.metricsService.getOriginalHeight()
  }

  public getWidth(): number {
    if (!this.services?.metricsService) {
      return Math.floor(
        this.getOriginalWidth() * this.runtime.getOptions().scale
      )
    }
    return this.services.metricsService.getWidth()
  }

  public getHeight(): number {
    if (!this.services?.metricsService) {
      return Math.floor(
        this.getOriginalHeight() * this.runtime.getOptions().scale
      )
    }
    return this.services.metricsService.getHeight()
  }

  public getMainOuterHeight(): number {
    return this.services.metricsService.getMainOuterHeight()
  }

  public getInnerWidth(): number {
    return this.services.metricsService.getInnerWidth()
  }

  public getOriginalInnerWidth(): number {
    return this.services.metricsService.getOriginalInnerWidth()
  }

  public getContextInnerWidth(): number {
    return this.services.metricsService.getContextInnerWidth()
  }

  public getMargins(): IMargin {
    return this.services.metricsService.getMargins()
  }

  public getOriginalMargins(): number[] {
    return this.services.metricsService.getOriginalMargins()
  }

  public getPageGap(): number {
    if (!this.services?.metricsService) {
      const options = this.runtime.getOptions()
      return options.pageGap * options.scale
    }
    return this.services.metricsService.getPageGap()
  }

  public getOriginalPageGap(): number {
    if (!this.services?.metricsService) {
      return this.runtime.getOptions().pageGap
    }
    return this.services.metricsService.getOriginalPageGap()
  }

  public getDefaultBasicRowMarginHeight(): number {
    return this.services.metricsService.getDefaultBasicRowMarginHeight()
  }

  public getTdPadding(): IPadding {
    return this.services.metricsService.getTdPadding()
  }

  public setVisiblePageNoList(payload: number[]) {
    this.viewState.setVisiblePageNoList(payload)
    this.services.workerRenderScheduler.updateViewport({
      visiblePageNoList: payload,
      intersectionPageNo: this.viewState.getIntersectionPageNo()
    })
  }

  public setIntersectionPageNo(payload: number) {
    this.viewState.setIntersectionPageNo(payload)
    this.services.workerRenderScheduler.updateViewport({
      visiblePageNoList: this.viewState.getVisiblePageNoList(),
      intersectionPageNo: payload
    })
  }

  public getPageNo(): number {
    return this.viewState.getPageNo()
  }

  public setPageNo(payload: number) {
    this.viewState.setPageNo(payload)
  }

  public getPageCount(): number {
    return this.pageCanvasHost.getPageCount()
  }

  public getTableLayoutSnapshotAccessor(): TableLayoutSnapshotAccessor {
    return this.services.tableLayoutSnapshotAccessor
  }

  public getTableRowList(sourceElementList: IElement[]): IRow[] {
    return this.services.dataAccess.getTableRowList(sourceElementList)
  }

  public getOriginalRowList() {
    return this.services.dataAccess.getOriginalRowList()
  }

  public getRowList(): IRow[] {
    return this.services.dataAccess.getRowList()
  }

  public getPageRowList(): IRow[][] {
    return this.runtime.getPageRowList()
  }

  public getOptions(): DeepRequired<IEditorOption> {
    return this.runtime.getOptions()
  }

  public isPagingPageMode(): boolean {
    return this.getIsPagingMode()
  }

  public getLayoutMainElementList(): IElement[] {
    return this.runtime.getLayoutMainElementList()
  }

  public getTableLayoutSnapshot(): ITableLayoutSnapshot {
    return this.services.renderFacadeService.getTableLayoutSnapshot()
  }

  public getWordLikeReg(): RegExp {
    return this.WORD_LIKE_REG
  }

  public getPageCanvasHost(): PageCanvasHost {
    return this.pageCanvasHost
  }

  /**
   * 获取渲染后端统计信息。
   *
   * 该入口用于观察 canvas 池复用情况和多引擎调度命中情况。
   */
  public getRenderBackendStats() {
    const surface = this.pageCanvasHost.getSurfaceStats()
    const canvasPool = this.pageCanvasHost.getCanvasPoolStats()
    const bitmapCache = surface.bitmapCache
    const imagePreview = this.getImageParticle().getPreviewBitmapCacheStats()
    const estimatedTotalBytes =
      surface.estimatedActiveBytes +
      canvasPool.estimatedIdleBytes +
      bitmapCache.estimatedBytes +
      imagePreview.estimatedBytes
    return {
      surface,
      canvasPool,
      backend: this.services.renderBackendManager.getStats(),
      // imagePreview 统计 WebGL / Canvas2D 图片任务处理后的预览 bitmap 复用情况。
      imagePreview,
      // baseRenderSource 区分同步 Canvas2D 重画、worker bitmap 合成和 bitmap cache 合成。
      baseRenderSource: this.services.pageRenderer.getBaseRenderSourceStats(),
      // typingPreview 统计输入态 chunk / 行级 canvas 局部重绘命中情况。
      typingPreview: this.services.pageRenderer.getTypingPreviewStats(),
      // layout 用于定位 1000 页输入后仍然卡顿的整篇排版阶段耗时。
      layout: this.services.layoutPipeline.getStats(),
      // documentChunk 用于推进商业级段落 / chunk 增量布局。
      documentChunk: this.services.documentChunkIndex.getStats(),
      // tableChunkRange 用于观察页 chunk、表格 chunk、td 子 chunk 的父子范围同步。
      tableChunkRange: this.services.tableChunkRangeIndex.getStats(),
      // tableCellChunk 用于推进表格单元格父子 chunk 增量布局。
      tableCellChunk: this.services.tableCellChunkIndex.getStats(),
      // tableCellChunkPipeline 统计表格 td 子 chunk 的同步局部写回。
      tableCellChunkPipeline: this.services.tableCellChunkPipeline.getStats(),
      // tableLocalRelayout 统计表格级局部重分页是否接管表格输入。
      tableLocalRelayout: this.services.tableLocalRelayoutPipeline.getStats(),
      // chunkLayout 统计输入态 chunk 管线 patch 命中与失败原因。
      chunkLayout: this.services.chunkLayoutPipeline.getStats(),
      // asyncInsert 统计大粘贴后台分批事务，观察首批响应、剩余批次和取消情况。
      asyncInsert: this.services.mutationService.getAsyncInsertStats(),
      // typingLinePatch 统计 chunk 失败后单行正式 patch 的覆盖情况。
      typingLinePatch: this.services.typingLinePatchPipeline.getStats(),
      tableSnapshot: this.services.tableLayoutSnapshotAccessor.getStats(),
      // documentTextStore 统计正文主数据适配层，后续替换为 piece-table / rope 时用于双写对比。
      documentTextStore: this.runtime.getDocumentTextStoreStats(),
      // workerRender 统计 OffscreenCanvas 后台页渲染 job、fallback 和过期丢弃。
      workerRender: this.services.workerRenderScheduler.getStats(),
      memory: {
        // activeSurfaceBytes 统计已挂载、测量和 transient surface 的当前占用。
        activeSurfaceBytes: surface.estimatedActiveBytes,
        idleCanvasPoolBytes: canvasPool.estimatedIdleBytes,
        bitmapCacheBytes: bitmapCache.estimatedBytes,
        imagePreviewBitmapBytes: imagePreview.estimatedBytes,
        estimatedTotalBytes,
        estimatedTotalMB: Math.round((estimatedTotalBytes / 1024 / 1024) * 100) / 100,
        peakActiveSurfaceBytes: surface.peakEstimatedActiveBytes,
        peakIdleCanvasPoolBytes: canvasPool.peakEstimatedIdleBytes,
        peakBitmapCacheBytes: bitmapCache.peakEstimatedBytes
      },
      // baseBitmapContentVersion 用于排查非布局基础视觉变化导致的缓存失效。
      baseBitmapContentVersion:
        this.services.renderInvalidationManager.getBaseBitmapContentVersion()
    }
  }

  /** 获取面向调试面板的聚合快照，避免业务方理解完整统计树结构。 */
  public getRenderBackendDebugSnapshot(): IRenderBackendDebugSnapshot {
    const stats = this.getRenderBackendStats()
    const webglCapability = stats.backend.capabilityList.find(item => {
      return item.name === 'webgl'
    }) as Record<string, number | string | boolean | undefined> | undefined
    const previewTotal =
      stats.imagePreview.hitCount + stats.imagePreview.missCount
    const documentTextStore = stats.documentTextStore
    return {
      pageCount: this.getPageCount(),
      visiblePageNoList: this.viewState.getVisiblePageNoList(),
      intersectionPageNo: this.viewState.getIntersectionPageNo(),
      currentPageNo: this.getPageNo(),
      backend: {
        dispatchCount: stats.backend.dispatchCount,
        renderCount: stats.backend.renderCount,
        missCount: stats.backend.missCount,
        failureCount: stats.backend.failureCount,
        fallbackCount: stats.backend.fallbackCount,
        slowCount: stats.backend.recentWindow.slowCount,
        capabilityList: stats.backend.capabilityList
      },
      worker: {
        submitCount: stats.workerRender.submitCount,
        successCount: stats.workerRender.successCount,
        fallbackCount: stats.workerRender.fallbackCount,
        pendingCount: stats.workerRender.pendingCount,
        activeCount: stats.workerRender.activeCount,
        queuedCount: stats.workerRender.queuedCount,
        circuitOpen: stats.workerRender.circuitOpen,
        lastFallbackReason: stats.workerRender.lastFallbackReason
      },
      baseRenderSource: {
        canvas2DRenderCount: stats.baseRenderSource.canvas2DRenderCount,
        workerRenderCount: stats.baseRenderSource.workerRenderCount,
        bitmapCacheComposeCount:
          stats.baseRenderSource.bitmapCacheComposeCount
      },
      typingPreview: {
        attemptCount: stats.typingPreview.attemptCount,
        patchSuccessCount: stats.typingPreview.chunkSuccessCount,
        linePatchSuccessCount: stats.typingPreview.lineSuccessCount,
        failureCount: stats.typingPreview.failCount
      },
      image: {
        previewCacheHitRate:
          previewTotal > 0
            ? Math.round((stats.imagePreview.hitCount / previewTotal) * 100) /
              100
            : 0,
        previewCacheEstimatedMB: stats.imagePreview.estimatedMB,
        webglTextureCacheMB: Number(webglCapability?.textureCacheMB || 0),
        webglMaxTextureCacheMB: Number(webglCapability?.maxTextureCacheMB || 0),
        estimatedDownsampleSavedPixels: Number(
          webglCapability?.estimatedDownsampleSavedPixels || 0
        ),
        savedUploadPixels: Number(webglCapability?.savedUploadPixels || 0)
      },
      memory: {
        estimatedTotalMB: stats.memory.estimatedTotalMB,
        activeSurfaceMB: Math.round(
          (stats.memory.activeSurfaceBytes / 1024 / 1024) * 100
        ) / 100,
        bitmapCacheMB: Math.round(
          (stats.memory.bitmapCacheBytes / 1024 / 1024) * 100
        ) / 100,
        imagePreviewBitmapMB: Math.round(
          (stats.memory.imagePreviewBitmapBytes / 1024 / 1024) * 100
        ) / 100,
        idleCanvasPoolMB: Math.round(
          (stats.memory.idleCanvasPoolBytes / 1024 / 1024) * 100
        ) / 100
      },
      documentTextStore: {
        type: documentTextStore.type,
        length: documentTextStore.length,
        operationCount: documentTextStore.operationCount,
        externalMutationCount: documentTextStore.externalMutationCount,
        mirrorMode: documentTextStore.mirrorMode,
        mirrorHealthy: documentTextStore.mirrorHealthy,
        mirrorReplayCount: documentTextStore.mirrorReplayCount,
        mirrorReplayMismatchCount:
          documentTextStore.mirrorReplayMismatchCount,
        mirrorReplaySkippedCount: documentTextStore.mirrorReplaySkippedCount
      }
    }
  }

  /** 按当前配置同步默认关闭的渲染后端调试面板。 */
  private syncRenderBackendDebugPanel() {
    if (!this.runtime.getOptions().renderBackend.debugPanel.enabled) {
      this.renderBackendDebugPanel?.destroy()
      this.renderBackendDebugPanel = null
      return
    }
    if (!this.renderBackendDebugPanel) {
      this.renderBackendDebugPanel = new RenderBackendDebugPanel(
        this.pageCanvasHost.getContainer(),
        () => this.getRenderBackendDebugSnapshot()
      )
    }
    this.renderBackendDebugPanel.update()
  }

  /**
   * 重置渲染后端相关统计。
   *
   * 仅清空性能计数、近期窗口和高水位基线，不释放当前 canvas / bitmap 资源。
   */
  public resetRenderBackendStats() {
    this.pageCanvasHost.resetRenderResourceStats()
    this.services.renderBackendManager.resetStats()
    this.services.pageRenderer.resetBaseRenderSourceStats()
    this.services.pageRenderer.resetTypingPreviewStats()
    this.services.layoutPipeline.resetStats()
    this.services.documentChunkIndex.resetStats()
    this.services.tableChunkRangeIndex.resetStats()
    this.services.tableCellChunkIndex.resetStats()
    this.services.tableCellChunkPipeline.resetStats()
    this.services.tableLocalRelayoutPipeline.resetStats()
    this.services.chunkLayoutPipeline.resetStats()
    this.services.mutationService.resetAsyncInsertStats()
    this.services.typingLinePatchPipeline.resetStats()
    this.services.tableLayoutSnapshotBuilder.resetStats()
    this.services.workerRenderScheduler.resetStats()
    this.getImageParticle().resetPreviewBitmapCacheStats()
    this.runtime.resetDocumentTextStoreStats()
  }

  public getRuntime(): DrawRuntime {
    return this.runtime
  }

  public getServices(): DrawServiceRegistry {
    return this.services
  }

  public getTrackChange(): TrackChangeService {
    return this.services.trackChangeService
  }

  public getComponents(): DrawComponentRegistry {
    return this.components
  }

  public setBootstrapHistoryManager(payload: HistoryManager) {
    this.bootstrapHistoryManager = payload
  }

  public setBootstrapPosition(payload: Position) {
    this.bootstrapPosition = payload
  }

  public setBootstrapZone(payload: Zone) {
    this.bootstrapZone = payload
  }

  public setBootstrapRange(payload: RangeManager) {
    this.bootstrapRange = payload
  }

  public setBootstrapHeader(payload: Header) {
    this.bootstrapHeader = payload
  }

  public setBootstrapFooter(payload: Footer) {
    this.bootstrapFooter = payload
  }

  public setBootstrapTableParticle(payload: TableParticle) {
    this.bootstrapTableParticle = payload
  }

  public setBootstrapHyperlinkParticle(payload: HyperlinkParticle) {
    this.bootstrapHyperlinkParticle = payload
  }

  public setBootstrapDateParticle(payload: DateParticle) {
    this.bootstrapDateParticle = payload
  }

  public setBootstrapImageParticle(payload: ImageParticle) {
    this.bootstrapImageParticle = payload
  }

  public setBootstrapControl(payload: Control) {
    this.bootstrapControl = payload
  }

  public setBootstrapCursor(payload: Cursor) {
    this.bootstrapCursor = payload
  }

  public setBootstrapTableHitTestService(payload: TableHitTestService) {
    this.bootstrapTableHitTestService = payload
  }

  public getViewState(): DrawViewState {
    return this.viewState
  }

  public getTableLayoutSnapshotVersion(): number {
    return this.runtime.getTableLayoutSnapshotVersion()
  }

  public getSearch(): Search {
    return this.components.search
  }

  public getBackground(): Background {
    return this.components.background
  }

  public getWaterMark(): Watermark {
    return this.components.waterMark
  }

  public getMargin(): Margin {
    return this.components.margin
  }

  public getPageNumber(): PageNumber {
    return this.components.pageNumber
  }

  public getPlaceholder(): Placeholder {
    return this.components.placeholder
  }

  public getLineNumber(): LineNumber {
    return this.components.lineNumber
  }

  public getPageBorder(): PageBorder {
    return this.components.pageBorder
  }

  public getHighlight(): Highlight {
    return this.components.highlight
  }

  public getUnderline(): Underline {
    return this.components.underline
  }

  public getStrikeout(): Strikeout {
    return this.components.strikeout
  }

  public getGroup(): Group {
    return this.components.group
  }

  public getArea(): Area {
    return this.components.area
  }

  public getBadge(): Badge {
    return this.components.badge
  }

  public getHistoryManager(): HistoryManager {
    return this.components?.historyManager || this.bootstrapHistoryManager!
  }

  public getPosition(): Position {
    return this.components?.position || this.bootstrapPosition!
  }

  public getTableHitTestService(): TableHitTestService {
    return this.components?.tableHitTestService || this.bootstrapTableHitTestService!
  }

  public getTableOverlayRenderer(): TableOverlayRenderer {
    return this.services.tableOverlayRenderer
  }

  public getZone(): Zone {
    return this.components?.zone || this.bootstrapZone!
  }

  public getRange(): RangeManager {
    return this.components?.range || this.bootstrapRange!
  }

  public getLineBreakParticle(): LineBreakParticle {
    return this.components.lineBreakParticle
  }

  public getTextParticle(): TextParticle {
    return this.components.textParticle
  }

  public getHeaderElementList(): IElement[] {
    return this.services.dataAccess.getHeaderElementList()
  }

  public getTableElementList(sourceElementList: IElement[]): IElement[] {
    return this.services.dataAccess.getTableElementList(sourceElementList)
  }

  public getElementList(): IElement[] {
    return this.services.dataAccess.getElementList()
  }

  public getMainElementList(): IElement[] {
    return this.services.dataAccess.getMainElementList()
  }

  public getOriginalElementList() {
    return this.services.dataAccess.getOriginalElementList()
  }

  public getOriginalMainElementList(): IElement[] {
    return this.runtime.getOriginalMainElementList()
  }

  public getEditor2DocumentTree(): IEditorData {
    return this.runtime.getEditor2DocumentTree()
  }

  public getFooterElementList(): IElement[] {
    return this.services.dataAccess.getFooterElementList()
  }

  public getTd(): ITd | null {
    return this.services.dataAccess.getTd()
  }

  public insertElementList(
    payload: IElement[],
    options: IInsertElementListOption = {}
  ) {
    this.services.mutationService.insertElementList(payload, options)
  }

  public appendElementList(
    elementList: IElement[],
    options: IAppendElementListOption = {}
  ) {
    this.services.mutationService.appendElementList(elementList, options)
  }

  public spliceElementList(
    elementList: IElement[],
    start: number,
    deleteCount: number,
    items?: IElement[],
    options?: ISpliceElementListOption
  ) {
    this.services.mutationService.spliceElementList(
      elementList,
      start,
      deleteCount,
      items,
      options
    )
  }

  public getListener(): Listener {
    return this.listener
  }

  public getEventBus(): EventBus<EventBusMap> {
    return this.eventBus
  }

  public getOverride(): Override {
    return this.override
  }

  public getCursor(): Cursor {
    return this.components?.cursor || this.bootstrapCursor!
  }

  public getImageParticle(): ImageParticle {
    return this.components?.imageParticle || this.bootstrapImageParticle!
  }

  public getLaTexParticle(): LaTexParticle {
    return this.components.laTexParticle
  }

  public getTableParticle(): TableParticle {
    return this.components?.tableParticle || this.bootstrapTableParticle!
  }

  public getHeader(): Header {
    return this.components?.header || this.bootstrapHeader!
  }

  public getFooter(): Footer {
    return this.components?.footer || this.bootstrapFooter!
  }

  public getHyperlinkParticle(): HyperlinkParticle {
    return this.components?.hyperlinkParticle || this.bootstrapHyperlinkParticle!
  }

  public getDateParticle(): DateParticle {
    return this.components?.dateParticle || this.bootstrapDateParticle!
  }

  public getSeparatorParticle(): SeparatorParticle {
    return this.components.separatorParticle
  }

  public getPageBreakParticle(): PageBreakParticle {
    return this.components.pageBreakParticle
  }

  public getSuperscriptParticle(): SuperscriptParticle {
    return this.components.superscriptParticle
  }

  public getSubscriptParticle(): SubscriptParticle {
    return this.components.subscriptParticle
  }

  public getListParticle(): ListParticle {
    return this.components.listParticle
  }

  public getCheckboxParticle(): CheckboxParticle {
    return this.components.checkboxParticle
  }

  public getRadioParticle(): RadioParticle {
    return this.components.radioParticle
  }

  public getBlockParticle(): BlockParticle {
    return this.components.blockParticle
  }

  public getControl(): Control {
    return this.components?.control || this.bootstrapControl!
  }

  public getImageObserver(): ImageObserver {
    return this.components.imageObserver
  }

  public replaceMainElementList(payload: IElement[]) {
    this.runtime.replaceMainElementList(payload)
  }

  public syncEditor2DocumentTree() {
    this.runtime.syncEditor2DocumentTree({
      header: this.getHeaderElementList(),
      main: this.getOriginalMainElementList(),
      footer: this.getFooterElementList()
    })
  }

  /** 记录仍由旧数组链路完成的正文写操作，供后续 store mirror 对齐。 */
  public recordDocumentTextStoreExternalMutation(payload: {
    start: number | null
    deleteCount: number
    insertCount: number
    insertSignatureList?: string[]
    deleteIndexList?: number[]
    deleteSignatureList?: string[]
    type?: 'external-splice' | 'external-replace-all'
  }) {
    this.runtime.getDocumentTextStore().recordExternalMutation({
      type: payload.type || 'external-splice',
      start: payload.start,
      deleteCount: payload.deleteCount,
      insertCount: payload.insertCount,
      insertSignatureList: payload.insertSignatureList,
      insertSignatureCount: payload.insertSignatureList?.length,
      deleteIndexList: payload.deleteIndexList,
      deleteSignatureList: payload.deleteSignatureList,
      deleteIndexCount: payload.deleteIndexList?.length,
      deleteSignatureCount: payload.deleteSignatureList?.length
    })
  }

  /** 创建正文 store mirror 使用的元素轻量签名。 */
  public createDocumentTextStoreElementSignature(element: IElement | undefined) {
    return createDocumentTextStoreElementSignature(element)
  }

  public replaceLayoutState(payload: {
    rowList: IRow[]
    pageRowList: IRow[][]
    layoutElementList: IElement[]
    tableLayoutSnapshotVersion: number
    tableLayoutSnapshot: ITableLayoutSnapshot | null
  }) {
    this.runtime.replaceLayoutState(payload)
  }

  public replaceTableLayoutSnapshot(payload: ITableLayoutSnapshot | null) {
    this.runtime.replaceTableLayoutSnapshot(payload)
  }

  public replacePrintModeData(payload: Required<IEditorData> | null) {
    this.runtime.replacePrintModeData(payload)
  }

  public replaceRuntimeMode(payload: EditorMode) {
    this.runtime.replaceMode(payload)
  }

  public replaceRuntimePagePixelRatio(payload: number | null) {
    this.viewState.replacePagePixelRatio(payload)
  }

  public scheduleFrameRender(payload?: IDrawOption) {
    this.services.renderInvalidationManager.scheduleFrameRender(payload)
  }

  public flushScheduledFrameRender() {
    this.services.renderInvalidationManager.flushScheduledFrameRender()
  }

  public refreshVisibleOverlay(options?: {
    isSelectionDirty?: boolean
    isSearchDirty?: boolean
    isControlDirty?: boolean
  }) {
    return this.services.viewportService.refreshVisibleOverlay(options)
  }

  public disconnectLazyRender() {
    this.services.viewportService.disconnectLazyRender()
  }

  public setLazyRenderObserver(observer: IntersectionObserver | null) {
    this.services.viewportService.setLazyRenderObserver(observer)
  }

  public getLazyRenderObserver(): IntersectionObserver | null {
    return this.services.viewportService.getLazyRenderObserver()
  }

  public getPointerCoordinates(
    evt: MouseEvent | DragEvent,
    prev: IPointerCoordinatePayload | null = null
  ) {
    return this.services.viewportService.getPointerCoordinates(evt, prev)
  }

  public getPointerDelta(
    prev: IPointerCoordinatePayload | null,
    next: IPointerCoordinatePayload
  ) {
    return this.services.viewportService.getPointerDelta(prev, next)
  }

  public resolveVisibleRenderPageNos(extraPageNos: number[] = []): number[] {
    return this.services.viewportService.resolveVisibleRenderPageNos(extraPageNos)
  }

  public getRowCount(): number {
    return this.getRowList().length
  }

  public async getDataURL(payload: IGetImageOption = {}): Promise<string[]> {
    this.flushAsyncInsertTransaction('get-data-url')
    return this.services.exportService.getDataURL(payload)
  }

  public getPainterStyle(): IElementStyle | null {
    return this.services.painterService.getPainterStyle()
  }

  public getPainterOptions(): IPainterOption | null {
    return this.runtime.getPainterOptions()
  }

  public setPainterStyle(
    payload: IElementStyle | null,
    options?: IPainterOption
  ) {
    this.services.painterService.setPainterStyle(payload, options)
  }

  public setDefaultRange() {
    this.services.painterService.setDefaultRange()
  }

  public getIsPagingMode(): boolean {
    return this.getOptions().pageMode === PageMode.PAGING
  }

  public setPageMode(payload: PageMode) {
    this.services.pageSetupService.setPageMode(payload)
  }

  public setPageScale(payload: number) {
    this.services.pageSetupService.setPageScale(payload)
  }

  public getPagePixelRatio(): number {
    return this.viewState.getPagePixelRatio()
  }

  public setPagePixelRatio(payload: number | null) {
    if (!this.viewState.setPagePixelRatio(payload)) {
      return
    }
    this.setPageDevicePixel()
  }

  public setPageDevicePixel() {
    this.services.pageSetupService.setPageDevicePixel()
  }

  public setPaperSize(width: number, height: number) {
    this.services.pageSetupService.setPaperSize(width, height)
  }

  public setPaperDirection(payload: PaperDirection) {
    this.services.pageSetupService.setPaperDirection(payload)
  }

  public setPaperMargin(payload: IMargin) {
    this.services.pageSetupService.setPaperMargin(payload)
  }

  public getOriginValue(
    options: IGetOriginValueOption = {}
  ): Required<IEditorData> {
    this.flushAsyncInsertTransaction('get-origin-value')
    this.getBlockParticle().syncIframeSrcdocFromDom()
    return this.services.valueService.getOriginValue(options)
  }

  public getValue(options: IGetValueOption = {}): IEditorResult {
    this.flushAsyncInsertTransaction('get-value')
    this.getBlockParticle().syncIframeSrcdocFromDom()
    return this.services.valueService.getValue(options)
  }

  public flushAsyncInsertTransaction(reason = 'manual') {
    return this.services.mutationService.flushAsyncInsertTransaction(reason)
  }

  public setValue(payload: Partial<IEditorData>, options?: ISetValueOption) {
    this.services.mutationService.setValue(payload, options)
  }

  public setEditorData(payload: Partial<IEditorData>) {
    this.services.valueService.setEditorData(payload)
  }

  public captureExportRenderState() {
    return this.services.exportStateService.captureExportRenderState()
  }

  public restoreExportRenderState(
    state: ReturnType<Draw['captureExportRenderState']>
  ) {
    this.services.exportStateService.restoreExportRenderState(state)
  }

  public getElementFont(el: IElement, scale = 1): string {
    return this.services.metricsService.getElementFont(el, scale)
  }

  public computeRowList(payload: IComputeRowListPayload) {
    return this.services.rowLayoutEngine.computeRowList({
      ...payload,
      isPagingPageMode:
        payload.isPagingPageMode ?? (payload as any).isPagingMode ?? false
    })
  }

  public drawRow(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    this.services.rowRenderer.drawRow(ctx, payload)
  }

  public drawSelection(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    this.services.rowRenderer.drawSelection(ctx, payload)
  }

  public refreshVisiblePagesIfNeeded() {
    this.services.viewportService.refreshVisiblePagesIfNeeded()
  }

  public enqueueExtraVisibleRenderPages(pageNoList: number[]) {
    this.services.viewportService.enqueueExtraVisibleRenderPages(pageNoList)
  }

  public render(payload?: IDrawOption) {
    this.services.renderFacadeService.render(payload)
    this.syncRenderBackendDebugPanel()
  }

  public setCursor(curIndex: number | undefined) {
    return this.services.cursorService.setCursor(curIndex)
  }

  public submitHistory(curIndex: number | undefined) {
    this.services.historyBridge.submitHistory(curIndex)
  }

  public destroy() {
    this.renderBackendDebugPanel?.destroy()
    this.renderBackendDebugPanel = null
    this.services.lifecycleService.destroy()
  }

  public clearSideEffect() {
    this.services.lifecycleService.clearSideEffect()
  }
}
