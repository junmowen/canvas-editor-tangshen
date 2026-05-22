import { ControlComponent } from '../../../dataset/enum/Control'
import { IElement } from '../../../interface/Element'

interface IControlValueScanPayload {
  elementList: IElement[]
  startIndex: number
  includeNestedParentControl?: boolean
}

interface IControlValueBoundaryPayload {
  elementList: IElement[]
  startIndex: number
  requireExplicitRightBoundary?: boolean
}

function isControlLeftBoundary(element: IElement, controlId?: string) {
  return (
    element.controlId !== controlId ||
    element.controlComponent === ControlComponent.PREFIX ||
    element.controlComponent === ControlComponent.PRE_TEXT
  )
}

function isControlRightBoundary(element: IElement, controlId?: string) {
  return (
    element.controlId !== controlId ||
    element.controlComponent === ControlComponent.POSTFIX ||
    element.controlComponent === ControlComponent.POST_TEXT
  )
}

export function collectControlValueElementList(
  payload: IControlValueScanPayload
): IElement[] {
  const { elementList, startIndex, includeNestedParentControl = false } = payload
  const startElement = elementList[startIndex]
  if (!startElement) return []
  const data: IElement[] = []
  let preIndex = startIndex
  while (preIndex > 0) {
    const preElement = elementList[preIndex]
    if (
      includeNestedParentControl &&
      preElement.parentControlId === startElement.controlId
    ) {
      data.unshift(preElement)
      preIndex--
      continue
    }
    if (isControlLeftBoundary(preElement, startElement.controlId)) {
      break
    }
    if (preElement.controlComponent === ControlComponent.VALUE) {
      data.unshift(preElement)
    }
    preIndex--
  }

  let nextIndex = startIndex + 1
  while (nextIndex < elementList.length) {
    const nextElement = elementList[nextIndex]
    if (
      includeNestedParentControl &&
      nextElement.parentControlId === startElement.controlId
    ) {
      data.push(nextElement)
      nextIndex++
      continue
    }
    if (isControlRightBoundary(nextElement, startElement.controlId)) {
      break
    }
    if (nextElement.controlComponent === ControlComponent.VALUE) {
      data.push(nextElement)
    }
    nextIndex++
  }
  return data
}

export function resolveControlValueBoundary(
  payload: IControlValueBoundaryPayload
): [number, number] | null {
  const { elementList, startIndex, requireExplicitRightBoundary = false } =
    payload
  const startElement = elementList[startIndex]
  if (!startElement) return null
  let leftIndex = -1
  let rightIndex = -1

  let preIndex = startIndex
  while (preIndex > 0) {
    const preElement = elementList[preIndex]
    if (isControlLeftBoundary(preElement, startElement.controlId)) {
      leftIndex = preIndex
      break
    }
    preIndex--
  }

  let nextIndex = startIndex + 1
  while (nextIndex < elementList.length) {
    const nextElement = elementList[nextIndex]
    if (isControlRightBoundary(nextElement, startElement.controlId)) {
      rightIndex = nextIndex - 1
      break
    }
    nextIndex++
  }

  if (!~leftIndex) return null
  if (!~rightIndex) {
    if (requireExplicitRightBoundary) return null
    rightIndex = elementList.length - 1
  }
  return leftIndex === rightIndex ? null : [leftIndex, rightIndex]
}
