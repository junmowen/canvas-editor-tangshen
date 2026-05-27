import { ControlComponent } from '../../../dataset/enum/Control'
import { IElement } from '../../../interface/Element'
import { getNonHideElementIndex } from '../../../utils/element'
import {
  isControlPlaceholderComponent,
  isControlPrefixComponent,
  isControlSuffixComponent,
  isControlValueComponent
} from './controlValue'

export interface IControlMoveCursorResult {
  newIndex: number
  newElement: IElement
}

export function resolveControlMoveCursorResult(payload: {
  elementList: IElement[]
  element: IElement
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
