import { IElement } from '../../../interface/Element'
import { formatElementContext } from '../../../utils/elementContext'
import { normalizeStructuredPasteElements } from '../../modules/paragraph/clipboard/normalizeStructuredPasteElements'
import { CanvasEvent } from '../CanvasEvent'

export function applyPasteElements(host: CanvasEvent, elementList: IElement[]) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  if (
    draw.isReadonly() ||
    draw.isDisabled() ||
    components.control.getIsDisabledPasteControl()
  ) {
    return
  }
  const rangeManager = components.range
  const { startIndex } = rangeManager.getEditBoundaryRange()
  const originalElementList = draw.getObjectResolver().getElementList()
  if (~startIndex && !rangeManager.getIsSelectAll()) {
    const anchorElement = originalElementList[startIndex]
    normalizeStructuredPasteElements(anchorElement, elementList)
    formatElementContext(originalElementList, elementList, startIndex, {
      isBreakWhenWrap: true,
      editorOptions: draw.getOptions()
    })
  }
  draw.insertElementList(elementList)
}
