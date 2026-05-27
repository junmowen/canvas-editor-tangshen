import { EditorMode } from '../../../dataset/enum/Editor'
import type { Draw } from '../Draw'

export class DrawStateQueryService {
  constructor(private readonly draw: Draw) {}

  public isReadonly() {
    if (this.draw.getComponents().area.getActiveAreaInfo()?.area?.mode) {
      return this.draw.getComponents().area.isReadonly()
    }
    switch (this.draw.getMode()) {
      case EditorMode.DESIGN:
        return false
      case EditorMode.READONLY:
      case EditorMode.PRINT:
        return true
      case EditorMode.FORM:
        return !this.draw.getComponents().control.getIsRangeWithinControl()
      default:
        return false
    }
  }

  public isDisabled() {
    if (this.draw.getMode() === EditorMode.DESIGN) return false
    const { startIndex, endIndex } =
      this.draw.getComponents().range.getEditBoundaryRange()
    const elementList = this.draw.getObjectResolver().getElementList()
    if (this.draw.getObjectResolver().getTd()?.disabled) return true
    if (startIndex === endIndex) {
      const startElement = elementList[startIndex]
      const nextElement = elementList[startIndex + 1]
      return !!(
        (startElement?.title?.disabled &&
          nextElement?.title?.disabled &&
          startElement.titleId === nextElement.titleId) ||
        (startElement?.control?.disabled &&
          nextElement?.control?.disabled &&
          startElement.controlId === nextElement.controlId)
      )
    }
    const selectionElementList = elementList.slice(startIndex + 1, endIndex + 1)
    return selectionElementList.some(
      element => element.title?.disabled || element.control?.disabled
    )
  }

  public isDesignMode() {
    return this.draw.getMode() === EditorMode.DESIGN
  }

  public isPrintMode() {
    return this.draw.getMode() === EditorMode.PRINT
  }
}
