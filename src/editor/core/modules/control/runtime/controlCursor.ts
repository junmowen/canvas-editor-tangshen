import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'
import { getNonHideElementIndex } from '../../../../utils/element'
import {
  isControlPlaceholderComponent,
  isControlPrefixComponent,
  isControlSuffixComponent,
  isControlValueComponent
} from './controlValue'

export interface IControlMoveCursorResult {
  /** 新索引位置，用于描述移动、插入或命中后的目标位置。 */
  newIndex: number
  /** 新元素对象，用于替换或插入到文档列表。 */
  newElement: IElement
}

export function resolveControlMoveCursorResult(payload: {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 新索引位置，用于描述移动、插入或命中后的目标位置。 */
  newIndex: number
}): IControlMoveCursorResult {
  const { elementList, element, newIndex } = payload
  if (element.hide || element.control?.hide || element.area?.hide) {
    const nonHideIndex = getNonHideElementIndex(elementList, newIndex)
    return {
      newIndex: nonHideIndex,
      newElement: elementList[nonHideIndex]
    }
  }
  if (isControlValueComponent(element.controlComponent)) {
    return {
      newIndex,
      newElement: element
    }
  }
  if (isControlSuffixComponent(element.controlComponent)) {
    let startIndex = newIndex + 1
    while (startIndex < elementList.length) {
      const nextElement = elementList[startIndex]
      if (nextElement.controlId !== element.controlId) {
        return {
          newIndex: startIndex - 1,
          newElement: elementList[startIndex - 1]
        }
      }
      startIndex++
    }
  } else if (isControlPrefixComponent(element.controlComponent)) {
    let startIndex = newIndex + 1
    while (startIndex < elementList.length) {
      const nextElement = elementList[startIndex]
      if (
        nextElement.controlId !== element.controlId ||
        !isControlPrefixComponent(nextElement.controlComponent)
      ) {
        return {
          newIndex: startIndex - 1,
          newElement: elementList[startIndex - 1]
        }
      }
      startIndex++
    }
  } else if (
    isControlPlaceholderComponent(element.controlComponent) ||
    element.controlComponent === ControlComponent.POST_TEXT
  ) {
    let startIndex = newIndex - 1
    while (startIndex > 0) {
      const preElement = elementList[startIndex]
      if (
        preElement.controlId !== element.controlId ||
        isControlValueComponent(preElement.controlComponent) ||
        isControlPrefixComponent(preElement.controlComponent)
      ) {
        return {
          newIndex: startIndex,
          newElement: elementList[startIndex]
        }
      }
      startIndex--
    }
  }
  return {
    newIndex,
    newElement: element
  }
}
