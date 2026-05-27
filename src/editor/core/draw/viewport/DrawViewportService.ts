import { IRow } from '../../../interface/Row'
import { PointerCoordinateService } from '../../event/pointer/coordinates/PointerCoordinateService'
import { IPointerCoordinatePayload } from '../../event/pointer/coordinates/PointerCoordinateTypes'
import type { Draw } from '../Draw'

export class DrawViewportService {
  private lazyRenderIntersectionObserver: IntersectionObserver | null = null
  private readonly pointerCoordinateService: PointerCoordinateService
  /** 下一次 visible 渲染必须额外覆盖的页码，用于清理布局迁移后的旧页残影。 */
  private readonly pendingExtraRenderPageNoSet = new Set<number>()

  constructor(private readonly draw: Draw) {
    this.pointerCoordinateService = new PointerCoordinateService(draw)
  }

  public refreshVisibleOverlay(options?: {
    isSelectionDirty?: boolean
    isSearchDirty?: boolean
    isControlDirty?: boolean
  }) {
    this.draw.getServices().renderInvalidationManager.markVisiblePagesDirty()
    this.draw.getServices().renderInvalidationManager.markOverlayDirty()
    if (options?.isSelectionDirty) {
      this.draw.getServices().renderInvalidationManager.markSelectionDirty()
    }
    if (options?.isSearchDirty) {
      this.draw.getServices().renderInvalidationManager.markSearchDirty()
    }
    if (options?.isControlDirty) {
      this.draw.getServices().renderInvalidationManager.markControlDirty()
    }
    return this.draw.getServices().renderInvalidationManager.renderVisibleOverlayIfNeeded()
  }

  public disconnectLazyRender() {
    this.lazyRenderIntersectionObserver?.disconnect()
  }

  public setLazyRenderObserver(observer: IntersectionObserver | null) {
    this.lazyRenderIntersectionObserver = observer
  }

  public getLazyRenderObserver(): IntersectionObserver | null {
    return this.lazyRenderIntersectionObserver
  }

  public getPointerCoordinates(
    evt: MouseEvent | DragEvent,
    prev: IPointerCoordinatePayload | null = null
  ) {
    return this.pointerCoordinateService.resolve(evt, prev)
  }

  public getPointerDelta(
    prev: IPointerCoordinatePayload | null,
    next: IPointerCoordinatePayload
  ) {
    return this.pointerCoordinateService.resolveDelta(prev, next)
  }

  public resolveVisibleRenderPageNos(extraPageNos: number[] = []): number[] {
    const renderPageNoSet = new Set<number>(
      this.draw.getViewState().getVisiblePageNoList()
    )
    this.pendingExtraRenderPageNoSet.forEach(pageNo => renderPageNoSet.add(pageNo))
    this.pendingExtraRenderPageNoSet.clear()
    const activePositionList = this.draw.getCoordinate().getPositionList()
    const { startIndex, endIndex } = this.draw.getRange().getEditBoundaryRange()
    const startPageNo = activePositionList[startIndex]?.pageNo
    const endPageNo = activePositionList[endIndex]?.pageNo

    if (startPageNo !== undefined && endPageNo !== undefined) {
      const minPageNo = Math.min(startPageNo, endPageNo)
      const maxPageNo = Math.max(startPageNo, endPageNo)
      for (let pageNo = minPageNo; pageNo <= maxPageNo; pageNo++) {
        renderPageNoSet.add(pageNo)
      }
    } else {
      if (startPageNo !== undefined) {
        renderPageNoSet.add(startPageNo)
      }
      if (endPageNo !== undefined) {
        renderPageNoSet.add(endPageNo)
      }
    }

    const cursorPosition = this.draw.getCoordinate().getCursorPosition()
    if (cursorPosition) {
      renderPageNoSet.add(cursorPosition.pageNo)
    }
    for (let i = 0; i < extraPageNos.length; i++) {
      renderPageNoSet.add(extraPageNos[i])
    }
    if (this.draw.getPageRowList()[this.draw.getPageNo()]) {
      renderPageNoSet.add(this.draw.getPageNo())
    }

    return renderPageNoSet.size
      ? Array.from(renderPageNoSet).sort((a, b) => a - b)
      : this.draw.getPageRowList().map((_: IRow[], index: number) => index)
  }

  /** 标记下一次 visible render 需要额外重绘的页码。 */
  public enqueueExtraVisibleRenderPages(pageNoList: number[]) {
    pageNoList.forEach(pageNo => {
      if (this.draw.getPageRowList()[pageNo]) {
        this.pendingExtraRenderPageNoSet.add(pageNo)
      }
    })
  }

  public refreshVisiblePagesIfNeeded() {
    if (
      !this.draw.getServices().renderInvalidationManager.hasVisiblePagesDirty() ||
      !this.draw.isPagingPageMode()
    ) {
      return
    }
    if (this.draw.getServices().renderInvalidationManager.renderVisibleOverlayIfNeeded()) {
      return
    }
    this.draw.getServices().renderInvalidationManager.cancelScheduledFrameRender()
    this.draw.getServices().pageRenderer.renderVisiblePages()
  }
}
