
import { ElementType } from '../../../dataset/enum/Element'
import { ImageDisplay } from '../../../dataset/enum/Common'
import { IElement } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import type { Draw } from '../../draw/Draw'

/** Shared state and utilities for worker page snapshot command builders. */
export abstract class PageRenderSnapshotBase {
  protected constructor(protected readonly draw: Draw) {}

  protected getActiveGroupIds(): string[] {
    const range = this.draw.getRange().getEditBoundaryRange()
    const activeGroupIds =
      range.endIndex >= 0
        ? this.draw.getElementList()[range.endIndex]?.groupIds
        : undefined
    return activeGroupIds || []
  }

  protected isFloatingImage(element: IElement): boolean {
    return Boolean(
      element.type === ElementType.IMAGE &&
        (element.imgDisplay === ImageDisplay.SURROUND ||
          element.imgDisplay === ImageDisplay.FLOAT_TOP ||
          element.imgDisplay === ImageDisplay.FLOAT_BOTTOM)
    )
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
