import { ZERO } from '../../../dataset/constant/Common'
import { VIRTUAL_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { IElement } from '../../../interface/Element'
import { formatElementContext } from '../../../utils/element'
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
    if (anchorElement?.titleId || anchorElement?.listId) {
      let start = 0
      while (start < elementList.length) {
        const currentElement = elementList[start]
        if (anchorElement.titleId && /^\n/.test(currentElement.value)) {
          break
        }
        if (VIRTUAL_ELEMENT_TYPE.includes(currentElement.type!)) {
          elementList.splice(start, 1)
          if (currentElement.valueList) {
            for (let v = 0; v < currentElement.valueList.length; v++) {
              const valueElement = currentElement.valueList[v]
              if (valueElement.value === ZERO || valueElement.value === '\n') {
                continue
              }
              elementList.splice(start, 0, valueElement)
              start++
            }
          }
          start--
        }
        start++
      }
    }
    formatElementContext(originalElementList, elementList, startIndex, {
      isBreakWhenWrap: true,
      editorOptions: draw.getOptions()
    })
  }
  draw.insertElementList(elementList)
}
