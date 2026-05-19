import { IRenderSurface, RenderLayer } from '../../render-backend'
import type { Draw } from '../Draw'

/** PageRenderer 的 base bitmap cache 控制器。 */
export class PageBitmapCacheController {
  /** base bitmap 缓存延迟写入计时器，按页合并连续输入导致的频繁重绘。 */
  private readonly pendingBaseBitmapCacheTimerMap = new Map<number, number>()

  /** base bitmap 缓存延迟写入版本，防止旧内容版本在输入后迟到写入。 */
  private readonly pendingBaseBitmapCacheVersionMap = new Map<number, number>()

  /** base bitmap 缓存写入延迟，给连续输入留出合并窗口。 */
  private readonly baseBitmapCacheDelay = 160

  constructor(private readonly draw: Draw) {}

  /**
   * 异步缓存可视页 base surface。
   *
   * 当前只写入 ImageBitmap 缓存，不启用读取合成路径，因此不会改变现有绘制结果。
   */
  public cacheVisibleBaseSurface(surface: IRenderSurface) {
    if (surface.layer !== RenderLayer.BASE || !surface.mounted) {
      return
    }
    if (
      !this.draw.getServices().renderInvalidationManager.canWriteBaseBitmapCache()
    ) {
      this.cancelPendingBaseBitmapCache(surface.pageNo)
      return
    }
    const contentVersion = this.getBaseBitmapContentVersion()
    const pageNo = surface.pageNo
    this.cancelPendingBaseBitmapCache(pageNo)
    this.pendingBaseBitmapCacheVersionMap.set(pageNo, contentVersion)
    const timerId = window.setTimeout(() => {
      this.pendingBaseBitmapCacheTimerMap.delete(pageNo)
      const pendingVersion =
        this.pendingBaseBitmapCacheVersionMap.get(pageNo)
      this.pendingBaseBitmapCacheVersionMap.delete(pageNo)
      if (pendingVersion !== this.getBaseBitmapContentVersion()) {
        return
      }
      const currentSurface = this.draw
        .getPageCanvasHost()
        .getSurface(pageNo, RenderLayer.BASE)
      if (
        !currentSurface ||
        !currentSurface.mounted ||
        currentSurface.layer !== RenderLayer.BASE
      ) {
        return
      }
      this.draw
        .getPageCanvasHost()
        .cacheSurfaceBitmap(currentSurface, {
          contentVersion: pendingVersion,
          source: 'canvas-2d-render'
        })
        .catch(() => {
          // bitmap 缓存是性能优化路径，失败时不影响主渲染结果。
        })
    }, this.baseBitmapCacheDelay)
    this.pendingBaseBitmapCacheTimerMap.set(pageNo, timerId)
  }

  /** 取消所有待写入的 base bitmap 缓存，通常在编辑器销毁时调用。 */
  public cancelPendingBitmapCache() {
    this.pendingBaseBitmapCacheTimerMap.forEach(timerId => {
      window.clearTimeout(timerId)
    })
    this.pendingBaseBitmapCacheTimerMap.clear()
    this.pendingBaseBitmapCacheVersionMap.clear()
  }

  /**
   * 尝试从 bitmap 缓存恢复 base surface。
   *
   * 只有缓存内容版本、尺寸、DPR 和 layer 全部匹配时才会命中；
   * 未命中时返回 false，调用方继续走完整 Canvas2D 绘制。
   */
  public restoreBaseSurfaceFromBitmapCache(surface: IRenderSurface): boolean {
    if (surface.layer !== RenderLayer.BASE || !surface.mounted) {
      return false
    }
    const restored = this.draw
      .getPageCanvasHost()
      .composeBitmapCacheToSurface(surface, {
        contentVersion: this.getBaseBitmapContentVersion()
      })
    if (restored) {
      this.draw
        .getServices()
        .pageRenderer.recordBaseRenderSource('bitmap-cache-compose', surface.pageNo)
    }
    return restored
  }

  /** 取消指定页待写入的 base bitmap 缓存。 */
  private cancelPendingBaseBitmapCache(pageNo: number) {
    const timerId = this.pendingBaseBitmapCacheTimerMap.get(pageNo)
    if (timerId !== undefined) {
      window.clearTimeout(timerId)
      this.pendingBaseBitmapCacheTimerMap.delete(pageNo)
    }
    this.pendingBaseBitmapCacheVersionMap.delete(pageNo)
  }

  /** 获取 base bitmap 内容版本，合并布局版本和非布局基础视觉版本。 */
  private getBaseBitmapContentVersion(): number {
    const layoutVersion = this.draw.getTableLayoutSnapshotVersion()
    const baseVisualVersion = this.draw
      .getServices()
      .renderInvalidationManager.getBaseBitmapContentVersion()
    // 组合版本用于区分布局变化和背景、水印等非布局基础视觉变化。
    return layoutVersion * 100000 + baseVisualVersion
  }
}
