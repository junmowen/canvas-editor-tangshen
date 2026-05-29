
import { IElement } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { isWorkerSnapshotFloatingImage } from '../../modules/image/render/WorkerSnapshotImageRenderPolicy'
import type { Draw } from '../../draw/Draw'

/** Shared state and utilities for worker page snapshot command builders. */
export abstract class PageRenderSnapshotBase {
  /** 初始化 PageRenderSnapshotBase 实例并注入运行依赖。 */
  protected constructor(protected readonly draw: Draw) {}

  protected getActiveGroupIds(): string[] {
    const range = this.draw.getRange().getEditBoundaryRange()
    const activeGroupIds =
      range.endIndex >= 0
        ? this.draw
            .getTargetResolver()
            .resolveRangeElement({ range, anchor: 'end' })?.groupIds
        : undefined
    return activeGroupIds || []
  }

  protected isFloatingImage(element: IElement): boolean {
    return isWorkerSnapshotFloatingImage(element)
  }


  protected shouldSkipHiddenElement(element: IRowElement): boolean {
    return Boolean(
      (element.hide || element.control?.hide || element.area?.hide) &&
        !this.draw.isDesignMode()
    )
  }


  /** 使用主线程测量上下文测量文本。 */
  protected measureTextMetrics(text: string, font: string): TextMetrics {
    const ctx = this.draw.getPageCanvasHost().getMeasureContext()
    ctx.save()
    ctx.font = font
    const metrics = ctx.measureText(text)
    ctx.restore()
    return metrics
  }

  /** 使用主线程测量上下文测量文本宽度。 */
  protected measureTextWidth(text: string, font: string): number {
    return this.measureTextMetrics(text, font).width
  }
}
