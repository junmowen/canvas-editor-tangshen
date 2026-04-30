import type { Draw } from '../../../draw/Draw'
import {
  IContainerPoint,
  IPointerCoordinatePayload,
  IPointerPoint,
  IResolvedPagePoint,
  IViewportPoint
} from './PointerCoordinateTypes'

export class PointerCoordinateService {
  constructor(private readonly draw: Draw) {}

  public resolve(
    evt: MouseEvent | DragEvent,
    prev: IPointerCoordinatePayload | null = null
  ): IPointerCoordinatePayload {
    const viewport = this.resolveViewportPoint(evt)
    const next: IPointerCoordinatePayload = {
      viewport,
      container: this.resolveContainerPoint(viewport),
      page: this.resolvePagePoint(viewport),
      deltaViewport: { x: 0, y: 0 },
      source: evt.type?.startsWith('drag') ? 'drag' : 'mouse'
    }
    next.deltaViewport = this.resolveDelta(prev, next)
    return next
  }

  public resolveViewportPoint(evt: MouseEvent | DragEvent): IViewportPoint {
    if (
      (evt.clientX === undefined || evt.clientY === undefined) &&
      evt.target instanceof HTMLCanvasElement &&
      evt.offsetX !== undefined &&
      evt.offsetY !== undefined
    ) {
      const rect = evt.target.getBoundingClientRect()
      return {
        x: rect.left + evt.offsetX,
        y: rect.top + evt.offsetY
      }
    }
    return {
      x: evt.clientX,
      y: evt.clientY
    }
  }

  public resolveContainerPoint(
    viewport: IViewportPoint
  ): IContainerPoint | null {
    const rect = this.draw
      .getPageCanvasHost()
      .getPageContainer()
      .getBoundingClientRect()
    return {
      x: viewport.x - rect.left,
      y: viewport.y - rect.top
    }
  }

  public resolvePagePoint(
    viewport: IViewportPoint
  ): IResolvedPagePoint | null {
    const pageList = this.draw.getPageCanvasHost().getPageList()
    let exactPage: HTMLCanvasElement | null = null
    let nearestPage: HTMLCanvasElement | null = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i < pageList.length; i++) {
      const page = pageList[i]
      const rect = page.getBoundingClientRect()
      if (viewport.x < rect.left || viewport.x > rect.right) continue
      if (viewport.y >= rect.top && viewport.y <= rect.bottom) {
        exactPage = page
        break
      }
      const distance =
        viewport.y < rect.top ? rect.top - viewport.y : viewport.y - rect.bottom
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestPage = page
      }
    }

    const targetPage = exactPage || nearestPage
    if (!targetPage) return null
    const rect = targetPage.getBoundingClientRect()
    return this.normalizePagePoint(
      targetPage,
      viewport.x - rect.left,
      viewport.y - rect.top,
      !!exactPage
    )
  }

  public resolveDelta(
    prev: IPointerCoordinatePayload | null,
    next: IPointerCoordinatePayload
  ): IPointerPoint {
    if (!prev) {
      return {
        x: 0,
        y: 0
      }
    }
    return {
      x: next.viewport.x - prev.viewport.x,
      y: next.viewport.y - prev.viewport.y
    }
  }

  private normalizePagePoint(
    page: HTMLCanvasElement,
    rawX: number,
    rawY: number,
    isExactPage: boolean
  ): IResolvedPagePoint {
    const rect = page.getBoundingClientRect()
    const x = Math.min(Math.max(rawX, 1), rect.width - 1)
    const pageHeight = this.draw.getHeight()
    const headerBottomY =
      this.draw.getHeader().getHeaderTop() + this.draw.getHeader().getHeight()
    const footerTopY =
      pageHeight -
      (this.draw.getFooter().getFooterBottom() + this.draw.getFooter().getHeight())
    const y = isExactPage
      ? Math.min(Math.max(rawY, 1), rect.height - 1)
      : Math.min(
          Math.max(rawY, headerBottomY + 1),
          Math.min(rect.height - 1, footerTopY - 1)
        )
    const pageIndex = page.getAttribute('data-index')
    return {
      pageIndex,
      pageNo: Number(pageIndex),
      x,
      y,
      isExactPage
    }
  }
}
