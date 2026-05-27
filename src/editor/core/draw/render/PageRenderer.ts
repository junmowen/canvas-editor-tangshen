import { IDrawFloatPayload, IDrawPagePayload } from '../../../interface/Draw'
import { ElementType } from '../../../dataset/enum/Element'
import { IRenderSurface, RenderLayer } from '../../render-backend'
import type { RenderTaskPriority } from '../../render-backend/types/RenderTask'
import type { Draw } from '../Draw'
import { PageBitmapCacheController } from './PageBitmapCacheController'
import { PageContentPainter } from './PageContentPainter'
import {
  ITypingPreviewStats,
  TypingPreviewRenderer
} from './TypingPreviewRenderer'

export type { ITypingPreviewStats }

export type BaseRenderSource =
  | 'canvas-2d-render'
  | 'worker-render'
  | 'bitmap-cache-compose'

export interface IBaseRenderSourceRecentSample {
  pageNo: number
  source: BaseRenderSource
  timestamp: number
}

export interface IBaseRenderSourceStats {
  canvas2DRenderCount: number
  workerRenderCount: number
  bitmapCacheComposeCount: number
  lastSourceByPageNo: Record<number, BaseRenderSource>
  recentWindow: {
    windowSize: number
    sampleCount: number
    sourceCountMap: Partial<Record<BaseRenderSource, number>>
    sampleList: IBaseRenderSourceRecentSample[]
  }
}

/**
 * 页面渲染器。
 *
 * 负责单页清屏、浮动元素绘制以及可视区域渲染调度。
 */
export class PageRenderer {
  /** base bitmap cache 控制器。 */
  private readonly bitmapCacheController: PageBitmapCacheController
  /** 单页内容绘制器。 */
  private readonly contentPainter: PageContentPainter
  /** 输入态局部 canvas 快速重绘器。 */
  private readonly typingPreviewRenderer: TypingPreviewRenderer
  /** base 内容来源统计，用于区分同步绘制、worker 合成和 bitmap cache 合成。 */
  private readonly baseRenderSourceSampleList: IBaseRenderSourceRecentSample[] = []
  private readonly baseRenderSourceRecentWindowSize = 120
  private readonly lastBaseRenderSourceByPageNo = new Map<number, BaseRenderSource>()
  private canvas2DRenderCount = 0
  private workerRenderCount = 0
  private bitmapCacheComposeCount = 0

  constructor(private readonly draw: Draw) {
    this.bitmapCacheController = new PageBitmapCacheController(draw)
    this.contentPainter = new PageContentPainter(draw)
    this.typingPreviewRenderer = new TypingPreviewRenderer(draw)
  }

  /**
   * 输入态 canvas 快速重绘。
   *
   * 优先做 chunk / 段落真实局部重排；如果 chunk 不安全，再兜底尝试单行重绘。
   * 失败时不做假预览，等待后台 layout。
   */
  public renderTypingChunkPreview(payload: {
    curIndex: number
    editIndex?: number
    insertedCount: number
  }): boolean {
    return this.typingPreviewRenderer.renderTypingChunkPreview(payload)
  }

  /** 获取输入态局部重绘统计。 */
  public getTypingPreviewStats(): ITypingPreviewStats {
    return this.typingPreviewRenderer.getStats()
  }

  /** 重置输入态局部重绘统计。 */
  public resetTypingPreviewStats() {
    this.typingPreviewRenderer.resetStats()
  }

  /** 记录 base surface 本次内容来源。 */
  public recordBaseRenderSource(source: BaseRenderSource, pageNo: number) {
    if (source === 'canvas-2d-render') {
      this.canvas2DRenderCount++
    } else if (source === 'worker-render') {
      this.workerRenderCount++
    } else {
      this.bitmapCacheComposeCount++
    }
    this.lastBaseRenderSourceByPageNo.set(pageNo, source)
    this.baseRenderSourceSampleList.push({
      pageNo,
      source,
      timestamp: performance.now()
    })
    if (
      this.baseRenderSourceSampleList.length >
      this.baseRenderSourceRecentWindowSize
    ) {
      this.baseRenderSourceSampleList.shift()
    }
  }

  /** 获取 base 内容来源统计。 */
  public getBaseRenderSourceStats(): IBaseRenderSourceStats {
    const sourceCountMap: Partial<Record<BaseRenderSource, number>> = {}
    this.baseRenderSourceSampleList.forEach(sample => {
      sourceCountMap[sample.source] = (sourceCountMap[sample.source] ?? 0) + 1
    })
    return {
      canvas2DRenderCount: this.canvas2DRenderCount,
      workerRenderCount: this.workerRenderCount,
      bitmapCacheComposeCount: this.bitmapCacheComposeCount,
      lastSourceByPageNo: Object.fromEntries(this.lastBaseRenderSourceByPageNo),
      recentWindow: {
        windowSize: this.baseRenderSourceRecentWindowSize,
        sampleCount: this.baseRenderSourceSampleList.length,
        sourceCountMap,
        sampleList: this.baseRenderSourceSampleList.map(sample => ({
          ...sample
        }))
      }
    }
  }

  /** 重置 base 内容来源统计。 */
  public resetBaseRenderSourceStats() {
    this.canvas2DRenderCount = 0
    this.workerRenderCount = 0
    this.bitmapCacheComposeCount = 0
    this.baseRenderSourceSampleList.length = 0
    this.lastBaseRenderSourceByPageNo.clear()
  }

  /** 绘制当前页的浮动图片与浮动元素。 */
  public drawFloat(ctx: CanvasRenderingContext2D, payload: IDrawFloatPayload) {
    this.contentPainter.drawFloat(ctx, payload)
  }

  public clearPage(pageNo: number) {
    const surface = this.draw
      .getPageCanvasHost()
      .getSurface(pageNo, RenderLayer.BASE)
    if (!surface) return
    this.contentPainter.clearBaseSurface(surface)
  }

  /** 按页绘制正文、页眉页脚与浮动元素。 */
  public drawPage(payload: IDrawPagePayload) {
    const { pageNo } = payload
    const surface = this.draw
      .getPageCanvasHost()
      .getSurface(pageNo, RenderLayer.BASE)
    if (!surface) return // Canvas 未挂载时不渲染
    const tileSurfaceList = this.draw
      .getPageCanvasHost()
      .prepareLayerTileSurfaces(pageNo, RenderLayer.BASE)
    if (!this.draw.isPagingPageMode() && tileSurfaceList.length > 1) {
      this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.BASE)
      this.draw.getServices().workerRenderScheduler.cancelPage(
        pageNo,
        'continuous page rendered by tiled sync backend'
      )
      this.draw.getComponents().blockParticle.clearPage(pageNo)
      tileSurfaceList.forEach(tileSurface => {
        this.draw.getServices().renderBackendManager.render(tileSurface, {
          pageNo,
          layer: RenderLayer.BASE,
          reason: 'base-visible',
          priority: 'sync',
          isCurrentPage: pageNo === this.draw.getPageNo(),
          isInteractive: true,
          pagePayload: payload,
          execute: currentSurface => {
            this.contentPainter.drawPageToSurface(
              payload,
              currentSurface,
              null,
              { offsetY: currentSurface.offsetY || 0 }
            )
          }
        })
      })
      this.recordBaseRenderSource('canvas-2d-render', pageNo)
      return
    }
    if (this.bitmapCacheController.restoreBaseSurfaceFromBitmapCache(surface)) {
      this.renderDomBlockHosts(payload)
      // base 命中缓存后仍需刷新 overlay，避免选区、搜索和控件高亮丢失。
      this.draw.getTableOverlayRenderer().renderPageOverlay(pageNo)
      return
    }
    // base 即将重绘，先使对应 bitmap 缓存失效，避免后续缓存合成读到旧内容。
    this.draw.getPageCanvasHost().invalidateBitmapCache(pageNo, RenderLayer.BASE)
    const isInteractive = this.isInteractivePage(pageNo)
    const priority = this.resolveBaseRenderPriority(pageNo, isInteractive)
    if (priority !== 'worker') {
      this.draw.getServices().workerRenderScheduler.cancelPage(
        pageNo,
        'page rendered by sync backend'
      )
    }
    this.draw.getServices().renderBackendManager.render(surface, {
      pageNo,
      layer: RenderLayer.BASE,
      reason: 'base-visible',
      priority,
      isCurrentPage: pageNo === this.draw.getPageNo(),
      isInteractive,
      pagePayload: payload,
      execute: currentSurface => {
        const selectionCtx = this.draw
          .getTableOverlayRenderer()
          .prepareSelectionContext(pageNo)
        this.contentPainter.drawPageToSurface(payload, currentSurface, selectionCtx)
        this.recordBaseRenderSource('canvas-2d-render', pageNo)
        this.bitmapCacheController.cacheVisibleBaseSurface(currentSurface)
      }
    })
  }

  /** 判断 base 页是否可以降为 worker 优先级。 */
  private resolveBaseRenderPriority(
    pageNo: number,
    isInteractive: boolean
  ): RenderTaskPriority {
    const options = this.draw.getRuntime().getOptions().renderBackend
    if (
      !options.offscreenCanvas.enabled ||
      !options.offscreenCanvas.nonCurrentPageBase ||
      isInteractive
    ) {
      return 'sync'
    }
    if (!this.draw.getPageRowList()[pageNo]) {
      return 'sync'
    }
    return 'worker'
  }

  /** 当前页、光标页、选区边界页、搜索态和激活控件页都视为交互页。 */
  private isInteractivePage(pageNo: number): boolean {
    if (this.draw.getSearch().getSearchKeyword()) {
      return true
    }
    if (pageNo === this.draw.getPageNo()) {
      return true
    }
    if (this.isActiveControlPage(pageNo)) {
      return true
    }
    const cursorPosition = this.draw.getCoordinate().getCursorPosition()
    if (cursorPosition?.pageNo === pageNo) {
      return true
    }
    const positionList = this.draw.getCoordinate().getPositionList()
    const { startIndex, endIndex } = this.draw.getRange().getEditBoundaryRange()
    return (
      positionList[startIndex]?.pageNo === pageNo ||
      positionList[endIndex]?.pageNo === pageNo
    )
  }

  /** 激活控件所在页必须留在同步路径，避免控件高亮和编辑态被后台 base 覆盖。 */
  private isActiveControlPage(pageNo: number): boolean {
    const activeControl = this.draw.getControl().getActiveControl()
    const controlId = activeControl?.getElement().controlId
    if (!controlId) {
      return false
    }
    const positionList = this.draw.getCoordinate().getPositionList()
    return positionList.some(position => {
      return position.pageNo === pageNo && position.element?.controlId === controlId
    })
  }

  /**
   * 在指定 surface 上绘制整页内容。
   *
   * 当前仍复用原 Canvas2D 绘制逻辑，外层已由 RenderBackendManager 统一调度。
   *
   * @param payload - 单页绘制数据
   * @param surface - 目标 base surface
   * @param selectionCtx - 可选的 overlay 2D 上下文
   */
  public drawPageToSurface(
    payload: IDrawPagePayload,
    surface: IRenderSurface,
    selectionCtx: CanvasRenderingContext2D | null = null
  ) {
    this.contentPainter.drawPageToSurface(payload, surface, selectionCtx)
  }

  /** 取消所有待写入的 base bitmap 缓存，通常在编辑器销毁时调用。 */
  public cancelPendingBitmapCache() {
    this.bitmapCacheController.cancelPendingBitmapCache()
  }

  /** base bitmap cache 命中时仍需重放 DOM/SVG block host。 */
  private renderDomBlockHosts(payload: IDrawPagePayload) {
    const pagePositionList =
      this.draw.getCoordinate().getLayoutMainPositionListByPage(payload.pageNo)
    let rowPositionOffset = 0
    for (let i = 0; i < payload.rowList.length; i++) {
      const row = payload.rowList[i]
      const rowPositionList = pagePositionList.slice(
        rowPositionOffset,
        rowPositionOffset + row.elementList.length
      )
      rowPositionOffset += row.elementList.length
      for (let j = 0; j < row.elementList.length; j++) {
        const element = row.elementList[j]
        const rowPosition = rowPositionList[j]
        if (element.type !== ElementType.BLOCK || !rowPosition) continue
        const {
          ascent,
          coordinate: {
            leftTop: [x, y]
          }
        } = rowPosition
        this.draw.getBlockParticle().render(payload.pageNo, element, x, y + ascent)
      }
    }
  }

  /** 使用 requestAnimationFrame 延迟触发渲染。 */
  public lazyRender() {
    let observer = this.draw.getLazyRenderObserver()
    
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const index = Number(
            (entry.target as HTMLDivElement).dataset.index
          )
          if (entry.isIntersecting) {
            // 先从画布池挂载画布
            this.draw.getPageCanvasHost().mountCanvas(index)

            const currentPositionList = this.draw.getCoordinate().getLayoutMainPositionList()
            const currentElementList = this.draw.getObjectResolver().getLayoutMainElementList()
            const currentRowList = this.draw.getPageRowList()[index]

            if (currentRowList) {
              this.drawPage({
                elementList: currentElementList,
                positionList: currentPositionList,
                rowList: currentRowList,
                pageNo: index
              })
            }
          } else {
            // 移出可视区后释放画布到池中
            this.draw.getPageCanvasHost().unmountCanvas(index)
          }
        })
      })
      this.draw.setLazyRenderObserver(observer)
    }

    this.draw.disconnectLazyRender()
    this.draw.getPageCanvasHost().getPageWrapperList().forEach(el => {
      observer!.observe(el)
    })
  }

  public immediateRender() {
    const positionList = this.draw.getCoordinate().getLayoutMainPositionList()
    const elementList = this.draw.getObjectResolver().getLayoutMainElementList()
    for (let i = 0; i < this.draw.getPageRowList().length; i++) {
      this.draw.getPageCanvasHost().mountCanvas(i)
      this.drawPage({
        elementList,
        positionList,
        rowList: this.draw.getPageRowList()[i],
        pageNo: i
      })
    }
  }

  /** 仅渲染当前视口内可见的页面。 */
  public renderVisiblePages() {
    const positionList = this.draw.getCoordinate().getLayoutMainPositionList()
    const elementList = this.draw.getObjectResolver().getLayoutMainElementList()
    const searchRenderPageNoList =
      this.draw.getSearch().consumeSearchRenderPageNoList()
    const pageNoList = this.draw.resolveVisibleRenderPageNos(searchRenderPageNoList)

    for (let i = 0; i < pageNoList.length; i++) {
      const pageNo = pageNoList[i]
      if (!this.draw.getPageRowList()[pageNo]) continue
      this.draw.getPageCanvasHost().mountCanvas(pageNo)
      this.drawPage({
        elementList,
        positionList,
        rowList: this.draw.getPageRowList()[pageNo],
        pageNo
      })
    }
  }
}
