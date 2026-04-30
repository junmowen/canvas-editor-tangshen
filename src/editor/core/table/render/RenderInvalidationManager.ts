import { IDrawOption } from '../../../interface/Draw'
import type { Draw } from '../../draw/Draw'

/**
 * 第一阶段渲染失效管理器。
 *
 * 当前先接管两类状态：
 * - visible pages dirty
 * - layout / selection / search / control / overlay dirty
 * - selection / search / overlay dirty
 * - visible-only 无布局重算路径的 RAF 合并调度
 *
 * 后续可继续扩展到 layout / selection / overlay dirty。
 */
export class RenderInvalidationManager {
  private draw: Draw
  private isVisiblePagesDirty: boolean
  private isLayoutDirty: boolean
  private isSelectionDirty: boolean
  private isSearchDirty: boolean
  private isControlDirty: boolean
  private isOverlayDirty: boolean
  private scheduledRenderPayload: IDrawOption | null
  private scheduledRenderFrameId: number | null

  constructor(draw: Draw) {
    this.draw = draw
    this.isVisiblePagesDirty = false
    this.isLayoutDirty = false
    this.isSelectionDirty = false
    this.isSearchDirty = false
    this.isControlDirty = false
    this.isOverlayDirty = false
    this.scheduledRenderPayload = null
    this.scheduledRenderFrameId = null
  }

  /** 标记当前可视页的基础渲染结果已失效。 */
  public markVisiblePagesDirty() {
    this.isVisiblePagesDirty = true
  }

  public clearVisiblePagesDirty() {
    this.isVisiblePagesDirty = false
  }

  public hasVisiblePagesDirty(): boolean {
    return this.isVisiblePagesDirty
  }

  /** 标记布局结果失效；此时不能再走 overlay-only 刷新。 */
  public markLayoutDirty() {
    this.isLayoutDirty = true
  }

  public clearLayoutDirty() {
    this.isLayoutDirty = false
  }

  public hasLayoutDirty(): boolean {
    return this.isLayoutDirty
  }

  /** 标记选区像素层失效。 */
  public markSelectionDirty() {
    this.isSelectionDirty = true
  }

  public clearSelectionDirty() {
    this.isSelectionDirty = false
  }

  public hasSelectionDirty(): boolean {
    return this.isSelectionDirty
  }

  /** 标记搜索高亮失效。 */
  public markSearchDirty() {
    this.isSearchDirty = true
  }

  public clearSearchDirty() {
    this.isSearchDirty = false
  }

  public hasSearchDirty(): boolean {
    return this.isSearchDirty
  }

  /** 标记控件高亮 / 装饰层失效。 */
  public markControlDirty() {
    this.isControlDirty = true
  }

  public clearControlDirty() {
    this.isControlDirty = false
  }

  public hasControlDirty(): boolean {
    return this.isControlDirty
  }

  /** 标记 overlay 层整体失效。 */
  public markOverlayDirty() {
    this.isOverlayDirty = true
  }

  public clearOverlayDirty() {
    this.isOverlayDirty = false
  }

  public hasOverlayDirty(): boolean {
    return this.isOverlayDirty
  }

  public scheduleFrameRender(payload?: IDrawOption) {
    // 当前只对“可见页、无布局重算、非 lazy”的高频路径做 RAF 合并；
    // 其余情况仍直接回到 Draw.render()。
    const isVisibleFrameRefresh =
      payload?.isCompute === false &&
      payload?.isLazy === false &&
      payload?.pageRenderScope === 'visible'
    if (
      !isVisibleFrameRefresh ||
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      this.draw.render(payload)
      return
    }
    this.markVisiblePagesDirty()
    this.markSelectionDirty()
    this.markOverlayDirty()
    this.scheduledRenderPayload = this._mergeScheduledRenderPayload(
      this.scheduledRenderPayload,
      payload
    )
    if (this.scheduledRenderFrameId !== null) {
      return
    }
    this.scheduledRenderFrameId = window.requestAnimationFrame(() => {
      const nextPayload = this.scheduledRenderPayload
      this.scheduledRenderPayload = null
      this.scheduledRenderFrameId = null
      this._dispatchScheduledRender(nextPayload || undefined)
    })
  }

  public flushScheduledFrameRender() {
    if (!this.scheduledRenderPayload) {
      return
    }
    const nextPayload = this.scheduledRenderPayload
    this.cancelScheduledFrameRender()
    this._dispatchScheduledRender(nextPayload || undefined)
  }

  public renderVisibleOverlayIfNeeded(): boolean {
    if (
      this.isLayoutDirty ||
      !(this.isOverlayDirty && (this.isSelectionDirty || this.isSearchDirty || this.isControlDirty))
    ) {
      return false
    }
    this.cancelScheduledFrameRender()
    this.draw.getTableOverlayRenderer().renderVisibleOverlay()
    return true
  }

  public cancelScheduledFrameRender() {
    if (
      this.scheduledRenderFrameId !== null &&
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      window.cancelAnimationFrame(this.scheduledRenderFrameId)
    }
    this.scheduledRenderFrameId = null
    this.scheduledRenderPayload = null
  }

  public reset() {
    this.cancelScheduledFrameRender()
    this.clearVisiblePagesDirty()
    this.clearLayoutDirty()
    this.clearSelectionDirty()
    this.clearSearchDirty()
    this.clearControlDirty()
    this.clearOverlayDirty()
  }

  private _dispatchScheduledRender(payload?: IDrawOption) {
    if (this._canRenderSelectionOverlayOnly(payload)) {
      this.draw.getTableOverlayRenderer().renderVisibleOverlay()
      return
    }
    this.draw.render(payload)
  }

  private _canRenderSelectionOverlayOnly(payload?: IDrawOption): boolean {
    return !!(
      payload &&
      payload.isCompute === false &&
      payload.isLazy === false &&
      payload.isSetCursor === false &&
      payload.pageRenderScope === 'visible' &&
      !this.isLayoutDirty &&
      this.isSelectionDirty &&
      this.isOverlayDirty
    )
  }

  private _mergeScheduledRenderPayload(
    prevPayload: IDrawOption | null,
    nextPayload?: IDrawOption
  ): IDrawOption {
    if (!prevPayload) {
      return { ...(nextPayload || {}) }
    }
    if (!nextPayload) {
      return { ...prevPayload }
    }
    const mergedPayload: IDrawOption = {
      ...prevPayload,
      ...nextPayload,
      isCompute: !!(prevPayload.isCompute || nextPayload.isCompute),
      isSubmitHistory: !!(
        prevPayload.isSubmitHistory || nextPayload.isSubmitHistory
      ),
      pageRenderScope:
        prevPayload.pageRenderScope === 'all' ||
        nextPayload.pageRenderScope === 'all'
          ? 'all'
          : prevPayload.pageRenderScope === 'visible' ||
              nextPayload.pageRenderScope === 'visible'
            ? 'visible'
            : undefined
    }
    if (nextPayload.curIndex !== undefined) {
      mergedPayload.curIndex = nextPayload.curIndex
    }
    return mergedPayload
  }
}
