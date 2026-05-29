import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

/** 切换选区元素的上标状态。 */
export function toggleSuperscriptSelection(elementList: IElement[]) {
  const superscriptIndex = elementList.findIndex(
    element => element.type === ElementType.SUPERSCRIPT
  )
  elementList.forEach(element => {
    if (~superscriptIndex) {
      if (element.type === ElementType.SUPERSCRIPT) {
        element.type = ElementType.TEXT
        delete element.actualSize
      }
    } else if (
      !element.type ||
      element.type === ElementType.TEXT ||
      element.type === ElementType.SUBSCRIPT
    ) {
      element.type = ElementType.SUPERSCRIPT
    }
  })
}

/** 切换选区元素的下标状态。 */
export function toggleSubscriptSelection(elementList: IElement[]) {
  const subscriptIndex = elementList.findIndex(
    element => element.type === ElementType.SUBSCRIPT
  )
  elementList.forEach(element => {
    if (~subscriptIndex) {
      if (element.type === ElementType.SUBSCRIPT) {
        element.type = ElementType.TEXT
        delete element.actualSize
      }
    } else if (
      !element.type ||
      element.type === ElementType.TEXT ||
      element.type === ElementType.SUPERSCRIPT
    ) {
      element.type = ElementType.SUBSCRIPT
    }
  })
}
