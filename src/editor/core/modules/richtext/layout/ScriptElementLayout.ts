import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'

/** 上下标文本测量修正器。 */
export class ScriptElementLayout {
  public applyActualSize(element: IElement, defaultSize: number) {
    if (!this.isScript(element)) return
    const size = element.size || defaultSize
    element.actualSize = Math.ceil(size * 0.6)
  }

  public adjustMetrics(element: IElement, metrics: IElementMetrics) {
    if (element.type === ElementType.SUPERSCRIPT) {
      metrics.boundingBoxAscent += metrics.height / 2
    } else if (element.type === ElementType.SUBSCRIPT) {
      metrics.boundingBoxDescent += metrics.height / 2
    }
  }

  private isScript(element: IElement) {
    return (
      element.type === ElementType.SUPERSCRIPT ||
      element.type === ElementType.SUBSCRIPT
    )
  }
}
