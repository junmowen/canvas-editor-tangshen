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
  IRuntimeEditorData,
  ISetValueOption
} from '../../interface/Editor'
import {
  IElement,
  IElementStyle,
  ISpliceElementListOption,
  IInsertElementListOption
} from '../../interface/Element'
import { IRow } from '../../interface/Row'
import { ITypesettingLayoutSnapshot } from '../../interface/TypesettingLayout'
import { Cursor } from '../runtime/cursor/Cursor'
import { HistoryManager } from '../runtime/history/HistoryManager'
import { Listener } from '../runtime/listener/Listener'
import { Position } from '../position/Position'
import { RangeManager } from '../range/RangeManager'
import { Background } from '../modules/background/runtime/Background'
import { Margin } from '../modules/page-setup/runtime/Margin'
import { Search } from '../modules/search/runtime/Search'
import { ImageParticle } from '../modules/image/particle/ImageParticle'
import { TextParticle } from './particle/TextParticle'
import { TableParticle } from '../modules/table/particle/TableParticle'
import { HyperlinkParticle } from '../modules/inline/particle/HyperlinkParticle'
import { Header } from '../modules/header/runtime/Header'
import { Watermark } from '../modules/watermark/runtime/Watermark'
import {
  EditorMode,
  PageMode,
  PaperDirection
} from '../../dataset/enum/Editor'
import { Control } from '../modules/control/runtime/Control'
import { CheckboxParticle } from '../modules/control/particle/CheckboxParticle'
import { RadioParticle } from '../modules/control/particle/RadioParticle'
import { DeepRequired, IPadding } from '../../interface/Common'
import { IMargin } from '../../interface/Margin'
import { BlockParticle } from '../modules/block/particle/BlockParticle'
import { I18n } from '../extension/i18n/I18n'
import { Zone } from '../runtime/zone/Zone'
import { Footer } from '../modules/footer/runtime/Footer'
import { ListParticle } from '../modules/list/particle/ListParticle'
import { EventBus } from '../event/eventbus/EventBus'
import { EventBusMap } from '../../interface/EventBus'
import { Group } from '../modules/group/runtime/Group'
import { Override } from '../extension/override/Override'
import { PageBorder } from '../modules/page-setup/runtime/PageBorder'
import { Area } from '../modules/area/runtime/Area'
import { Badge } from '../modules/badge/runtime/Badge'
import { TableOverlayRenderer } from '../modules/table/render/TableOverlayRenderer'
import { ITableLayoutSnapshot } from '../modules/table/layout/TableLayoutSnapshotTypes'
import { TableHitTestService } from '../modules/table/hittest/TableHitTestService'
import { PageCanvasHost } from './dom/PageCanvasHost'
import { DrawViewState } from './state/DrawViewState'
import { createDocumentTextStoreElementSignature } from './data/DocumentTextStore'
import {
  IRenderBackendDebugSnapshot
} from '../render-backend/RenderBackendDebugPanel'
import { DrawRuntime } from './runtime/DrawRuntime'
import { DrawComponentRegistry } from './runtime/DrawComponentRegistry'
import { DrawServiceRegistry } from './runtime/DrawServiceRegistry'
import { TrackChangeService } from './track-change/TrackChangeService'
import { DrawCoordinateService } from './coordinate/DrawCoordinateService'
import { DrawObjectResolverService } from './data/DrawObjectResolverService'
import { DrawTargetResolverService } from './data/DrawTargetResolverService'
import { createRenderBackendDebugSnapshot } from './DrawRenderBackendDebugSnapshot'
import {
  createRenderBackendStatsSnapshot,
  resetRenderBackendStatsSnapshot
} from './DrawRenderBackendStatsSnapshot'
import { DrawBootstrapRegistry } from './DrawBootstrapRegistry'
import { DrawRenderBackendDebugPanelController } from './DrawRenderBackendDebugPanelController'

export class Draw {
  /** Draw 运行时状态容器，集中托管模式、配置、正文数据和布局结果。 */
  private runtime: DrawRuntime
  /** 绘图组件注册表，集中持有光标、选区、控件、粒子等渲染组件。 */
  private components: DrawComponentRegistry
  /** 绘图服务注册表，集中持有布局、渲染、数据访问等服务实例。 */
  private services: DrawServiceRegistry
  /** 页面画布宿主，负责页面 DOM、canvas surface 和 bitmap cache 管理。 */
  private pageCanvasHost: PageCanvasHost
  /** 绘制视图状态，记录页码、可见页、像素比和渲染次数。 */
  private viewState: DrawViewState
  /** 构造阶段注入的临时依赖容器，在组件注册完成前提供启动期依赖。 */
  private bootstrapRegistry = new DrawBootstrapRegistry()
  /** 外部监听器集合，用于触发内容、页码、选区、控件等回调。 */
  private listener: Listener
  /** 事件总线实例，用于发布和订阅编辑器内部事件。 */
  private eventBus: EventBus<EventBusMap>
  /** 外部覆盖处理器集合，用于接管复制、粘贴、拖放等默认行为。 */
  private override: Override
  /** 渲染后端调试面板生命周期控制器。 */
  private renderBackendDebugPanelController =
    new DrawRenderBackendDebugPanelController()

  /** 字母字符匹配正则，用于判断单字符是否属于可组词字符。 */
  private LETTER_REG: RegExp
  /** 类单词边界匹配正则，用于双击选词和词级导航。 */
  private WORD_LIKE_REG: RegExp

  /** 初始化 Draw 实例并注入运行依赖。 */
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
    // 创建 bootstrap I18n 实例。
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

  /** 获取指定页正文外部占高，用于分页、分栏和导出高度计算。 */
  public getMainOuterHeight(pageNo = 0): number {
    return this.services.metricsService.getMainOuterHeight(pageNo)
  }

  /** 获取指定页缩放后的正文可用宽度，用于镜像页边距和装订线场景。 */
  public getInnerWidth(pageNo = 0): number {
    return this.services.metricsService.getInnerWidth(pageNo)
  }

  /** 获取指定页未缩放的正文可用宽度，用于导入导出和原始布局计算。 */
  public getOriginalInnerWidth(pageNo = 0): number {
    return this.services.metricsService.getOriginalInnerWidth(pageNo)
  }

  public getContextInnerWidth(): number {
    return this.services.metricsService.getContextInnerWidth()
  }

  public getMargins(pageNo = 0): IMargin {
    return this.services.metricsService.getMargins(pageNo)
  }

  public getOriginalMargins(pageNo = 0): number[] {
    return this.services.metricsService.getOriginalMargins(pageNo)
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

  public getCoordinate(): DrawCoordinateService {
    return this.services.coordinateService
  }

  public getObjectResolver(): DrawObjectResolverService {
    return this.services.objectResolverService
  }

  public getTargetResolver(): DrawTargetResolverService {
    return this.services.targetResolverService
  }

  public getPageRowList(): IRow[][] {
    return this.runtime.getPageRowList()
  }

  /** 获取段落块/栏/页排版中间层快照，用于调试和后续规则落地。 */
  public getTypesettingLayoutSnapshot(): ITypesettingLayoutSnapshot | null {
    return this.runtime.getTypesettingLayoutSnapshot()
  }

  public getOptions(): DeepRequired<IEditorOption> {
    return this.runtime.getOptions()
  }

  public isPagingPageMode(): boolean {
    return this.getIsPagingMode()
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
    return createRenderBackendStatsSnapshot(this)
  }

  /** 获取面向调试面板的聚合快照，避免业务方理解完整统计树结构。 */
  public getRenderBackendDebugSnapshot(): IRenderBackendDebugSnapshot {
    return createRenderBackendDebugSnapshot(this)
  }

  /** 按当前配置同步默认关闭的渲染后端调试面板。 */
  private syncRenderBackendDebugPanel() {
    this.renderBackendDebugPanelController.sync({
      enabled: this.runtime.getOptions().renderBackend.debugPanel.enabled,
      container: this.pageCanvasHost.getContainer(),
      getSnapshot: () => this.getRenderBackendDebugSnapshot()
    })
  }

  /**
   * 重置渲染后端相关统计。
   *
   * 仅清空性能计数、近期窗口和高水位基线，不释放当前 canvas / bitmap 资源。
   */
  public resetRenderBackendStats() {
    resetRenderBackendStatsSnapshot(this)
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
    this.bootstrapRegistry.setHistoryManager(payload)
  }

  public setBootstrapPosition(payload: Position) {
    this.bootstrapRegistry.setPosition(payload)
  }

  public setBootstrapZone(payload: Zone) {
    this.bootstrapRegistry.setZone(payload)
  }

  public setBootstrapRange(payload: RangeManager) {
    this.bootstrapRegistry.setRange(payload)
  }

  public setBootstrapHeader(payload: Header) {
    this.bootstrapRegistry.setHeader(payload)
  }

  public setBootstrapFooter(payload: Footer) {
    this.bootstrapRegistry.setFooter(payload)
  }

  public setBootstrapTableParticle(payload: TableParticle) {
    this.bootstrapRegistry.setTableParticle(payload)
  }

  public setBootstrapHyperlinkParticle(payload: HyperlinkParticle) {
    this.bootstrapRegistry.setHyperlinkParticle(payload)
  }

  public setBootstrapImageParticle(payload: ImageParticle) {
    this.bootstrapRegistry.setImageParticle(payload)
  }

  public setBootstrapControl(payload: Control) {
    this.bootstrapRegistry.setControl(payload)
  }

  public setBootstrapCursor(payload: Cursor) {
    this.bootstrapRegistry.setCursor(payload)
  }

  public setBootstrapTableHitTestService(payload: TableHitTestService) {
    this.bootstrapRegistry.setTableHitTestService(payload)
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

  public getPageBorder(): PageBorder {
    return this.components.pageBorder
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
    return this.bootstrapRegistry.resolveHistoryManager(this.components)
  }

  /** 内部坐标实现入口，仅允许 DrawCoordinateService 调用。 */
  public getInternalPosition(): Position {
    return this.bootstrapRegistry.resolvePosition(this.components)
  }

  public getTableHitTestService(): TableHitTestService {
    return this.bootstrapRegistry.resolveTableHitTestService(this.components)
  }

  public getTableOverlayRenderer(): TableOverlayRenderer {
    return this.services.tableOverlayRenderer
  }

  public getZone(): Zone {
    return this.bootstrapRegistry.resolveZone(this.components)
  }

  public getRange(): RangeManager {
    return this.bootstrapRegistry.resolveRange(this.components)
  }

  public getTextParticle(): TextParticle {
    return this.components.textParticle
  }

  public getEditor2DocumentTree(): IEditorData {
    return this.runtime.getEditor2DocumentTree()
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
    return this.bootstrapRegistry.resolveCursor(this.components)
  }

  public getImageParticle(): ImageParticle {
    return this.bootstrapRegistry.resolveImageParticle(this.components)
  }

  public getTableParticle(): TableParticle {
    return this.bootstrapRegistry.resolveTableParticle(this.components)
  }

  public getHeader(): Header {
    return this.bootstrapRegistry.resolveHeader(this.components)
  }

  public getFooter(): Footer {
    return this.bootstrapRegistry.resolveFooter(this.components)
  }

  public getHyperlinkParticle(): HyperlinkParticle {
    return this.bootstrapRegistry.resolveHyperlinkParticle(this.components)
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
    return this.bootstrapRegistry.resolveControl(this.components)
  }

  public replaceMainElementList(payload: IElement[]) {
    this.runtime.replaceMainElementList(payload)
  }

  public syncEditor2DocumentTree() {
    this.runtime.syncEditor2DocumentTree(
      this.getObjectResolver().getOriginalEditorData()
    )
  }

  /** 记录直接数组写入，供 document text store mirror 对齐。 */
  public recordDocumentTextStoreExternalMutation(payload: {
    /** 起始位置，用于描述范围、拖拽或扫描的入口。 */
    start: number | null
    /** 删除数量，用于描述从起点移除的元素个数。 */
    deleteCount: number
    /** 插入数量，用于描述本次新增元素规模。 */
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
    /** 行列表，保存排版后的行结构。 */
    rowList: IRow[]
    /** 页面行列表，保存当前页排版后的行信息。 */
    pageRowList: IRow[][]
    /** 布局元素列表，保存参与本轮排版的元素序列。 */
    layoutElementList: IElement[]
    /** 段落块/栏/页排版中间层快照。 */
    typesettingLayoutSnapshot?: ITypesettingLayoutSnapshot | null
    /** 表格布局snapshotversion数值，用于当前布局、统计或索引计算。 */
    tableLayoutSnapshotVersion: number
    tableLayoutSnapshot: ITableLayoutSnapshot | null
  }) {
    this.runtime.replaceLayoutState(payload)
  }

  public replaceTableLayoutSnapshot(payload: ITableLayoutSnapshot | null) {
    this.runtime.replaceTableLayoutSnapshot(payload)
  }

  public replacePrintModeData(payload: IRuntimeEditorData | null) {
    this.runtime.replacePrintModeData(payload)
  }

  public replaceRuntimeMode(payload: EditorMode) {
    this.runtime.replaceMode(payload)
  }

  public replaceRuntimePagePixelRatio(payload: number | null) {
    this.viewState.replacePagePixelRatio(payload)
  }

  public refreshVisibleOverlay(options?: {
    /** 是否选区脏区，用于控制当前流程的判断分支。 */
    isSelectionDirty?: boolean
    /** 是否搜索脏区，用于控制当前流程的判断分支。 */
    isSearchDirty?: boolean
    /** 是否控件脏区，用于控制当前流程的判断分支。 */
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

  public resolveVisibleRenderPageNos(extraPageNos: number[] = []): number[] {
    return this.services.viewportService.resolveVisibleRenderPageNos(extraPageNos)
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
  ): IRuntimeEditorData {
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

  /** 捕获 Export Render State 对应的当前状态。 */
  public captureExportRenderState() {
    return this.services.exportStateService.captureExportRenderState()
  }

  /** 恢复 Export Render State 对应的快照状态。 */
  public restoreExportRenderState(
    state: ReturnType<Draw['captureExportRenderState']>
  ) {
    this.services.exportStateService.restoreExportRenderState(state)
  }

  public getElementFont(el: IElement, scale = 1): string {
    return this.services.metricsService.getElementFont(el, scale)
  }

  /** 计算 Row List 对应的布局或状态。 */
  public computeRowList(payload: IComputeRowListPayload) {
    return this.services.rowLayoutEngine.computeRowList(payload)
  }

  public drawRow(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    this.services.rowRenderer.drawRow(ctx, payload)
  }

  public drawSelection(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    this.services.rowRenderer.renderSelection(ctx, payload)
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

  /** 销毁destroy相关资源，解除事件监听并释放持有对象。 */
  public destroy() {
    this.renderBackendDebugPanelController.destroy()
    this.services.lifecycleService.destroy()
  }

  public clearSideEffect() {
    this.services.lifecycleService.clearSideEffect()
  }
}
