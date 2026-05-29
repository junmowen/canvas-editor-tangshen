import { LocationPosition } from '../../../../dataset/enum/Common'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'

/** 解析控件定位命令应该落到的光标索引。 */
export function resolveControlLocationCursorIndex(payload: {
  element: IElement
  elementList: IElement[]
  index: number
  cursorIndex: number
  position?: LocationPosition
}): number | null {
  const { element, elementList, index, cursorIndex, position } = payload
  let curIndex = index
  if (position === LocationPosition.OUTER_AFTER) {
    if (
      !(
        element.controlComponent === ControlComponent.POSTFIX &&
        elementList[cursorIndex + 1]?.controlComponent !==
          ControlComponent.POST_TEXT
      )
    ) {
      return null
    }
  } else if (position === LocationPosition.OUTER_BEFORE) {
    curIndex -= 1
  } else if (position === LocationPosition.AFTER) {
    curIndex -= 1
    if (
      element.controlComponent !== ControlComponent.PLACEHOLDER &&
      element.controlComponent !== ControlComponent.POSTFIX &&
      element.controlComponent !== ControlComponent.POST_TEXT
    ) {
      return null
    }
  } else if (
    (element.controlComponent !== ControlComponent.PREFIX &&
      element.controlComponent !== ControlComponent.PRE_TEXT) ||
    elementList[cursorIndex]?.controlComponent === ControlComponent.PREFIX ||
    elementList[cursorIndex]?.controlComponent === ControlComponent.PRE_TEXT
  ) {
    return null
  }
  return curIndex
}
