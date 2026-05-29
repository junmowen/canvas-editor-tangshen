import { ZERO } from '../../../../dataset/constant/Common'
import { VIRTUAL_ELEMENT_TYPE } from '../../../../dataset/constant/Element'
import { IElement } from '../../../../interface/Element'

/** 清洗标题/列表锚点下粘贴进来的虚拟段落元素。 */
export function normalizeStructuredPasteElements(
  anchorElement: IElement | undefined,
  elementList: IElement[]
) {
  if (!anchorElement?.titleId && !anchorElement?.listId) return

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
