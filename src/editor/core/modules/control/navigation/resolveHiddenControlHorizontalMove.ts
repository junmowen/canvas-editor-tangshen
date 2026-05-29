import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'

type THorizontalDirection = 'prev' | 'next'

export function resolveHiddenControlHorizontalMove(payload: {
  elementList: IElement[]
  startIndex: number
  endIndex: number
  direction: THorizontalDirection
}): number | null {
  const { elementList, startIndex, endIndex, direction } = payload
  if (startIndex !== endIndex) return null

  const currentElement = elementList[startIndex]
  if (!currentElement?.controlId) return null

  const targetIndex = direction === 'prev' ? startIndex - 1 : endIndex + 1
  const targetElement = elementList[targetIndex]
  if (!targetElement?.controlId) return null
  if (targetElement.controlId !== currentElement.controlId) return null

  if (
    direction === 'prev' &&
    currentElement.controlComponent === ControlComponent.POSTFIX &&
    targetElement.controlComponent !== ControlComponent.POSTFIX
  ) {
    return targetIndex
  }

  if (
    direction === 'next' &&
    currentElement.controlComponent !== ControlComponent.POSTFIX
  ) {
    return targetIndex
  }

  return null
}
