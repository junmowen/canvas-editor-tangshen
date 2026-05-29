import { IDrawOption } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

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
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  private isVisiblePagesDirty: boolean
  private isLayoutDirty: boolean
  private isSelectionDirty: boolean
  private isSearchDirty: boolean
  private isControlDirty: boolean
  private isOverlayDirty: boolean
  private baseBitmapContentVersion: number
  /** 已调度的渲染请求参数，用于合并同一帧内的重复刷新。 */
  private scheduledRenderPayload: IDrawOption | null
  private scheduledRenderFrameId: number | null
  private suppressBaseBitmapCacheUntil: number

  /** 初始化 RenderInvalidationManager 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.isVisiblePagesDirty = false
    this.isLayoutDirty = false
    this.isSelectionDirty = false
    this.isSearchDirty = false
    this.isControlDirty = false
    this.isOverlayDirty = false
    this.baseBitmapContentVersion = 0
    this.scheduledRenderPayload = null
    this.scheduledRenderFrameId = null
    this.suppressBaseBitmapCacheUntil = 0
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

  /** 获取 base bitmap 内容版本，覆盖不触发布局重算的基础视觉变化。 */
  public getBaseBitmapContentVersion(): number {
    return this.baseBitmapContentVersion
  }

  /** 标记 base bitmap 内容失效，但不改变可视页 dirty 状态。 */
  public markBaseBitmapDirty() {
    this.baseBitmapContentVersion++
  }

  /** 输入态临时禁止 base bitmap 写入，避免高频 createImageBitmap 抢占主线程。 */
  public suppressBaseBitmapCache(duration = 500) {
    this.suppressBaseBitmapCacheUntil = Math.max(
      this.suppressBaseBitmapCacheUntil,
      performance.now() + duration
    )
  }

  /** 判断当前是否允许写入 base bitmap 缓存。 */
  public canWriteBaseBitmapCache(): boolean {
    return performance.now() >= this.suppressBaseBitmapCacheUntil
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
    // 当前对可见页刷新做 RAF 合并；输入类路径允许带布局重算，
    // 这样连续按键不会每个字符同步阻塞整份大文档排版。
    const isVisibleFrameRefresh =
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
    if (payload?.isCompute !== false) {
      this.markLayoutDirty()
    } else {
      this.markSelectionDirty()
      this.markOverlayDirty()
    }
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

  /** 取消 Scheduled Frame Render 对应的待处理任务。 */
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

  /** 重置当前状态，清空缓存的中间结果或统计信息。 */
  public reset() {
    this.cancelScheduledFrameRender()
    this.clearVisiblePagesDirty()
    this.clearLayoutDirty()
    this.clearSelectionDirty()
    this.clearSearchDirty()
    this.clearControlDirty()
    this.clearOverlayDirty()
    this.suppressBaseBitmapCacheUntil = 0
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
