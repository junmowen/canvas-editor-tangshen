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

export function isControlPrefixComponent(component?: ControlComponent | null) {
  return (
    component === ControlComponent.PREFIX ||
    component === ControlComponent.PRE_TEXT
  )
}

export function isControlSuffixComponent(component?: ControlComponent | null) {
  return (
    component === ControlComponent.POSTFIX ||
    component === ControlComponent.POST_TEXT
  )
}

export function isControlPlaceholderComponent(
  component?: ControlComponent | null
) {
  return component === ControlComponent.PLACEHOLDER
}

export function isControlValueComponent(component?: ControlComponent | null) {
  return component === ControlComponent.VALUE
}

export function isControlEntryElement(payload: {
  elementList: IElement[]
  index: number
}): boolean {
  const { elementList, index } = payload
  const element = elementList[index]
  if (!element?.controlComponent) return false
  return (
    element.controlComponent === ControlComponent.PREFIX ||
    (element.controlComponent === ControlComponent.VALUE &&
      !elementList[index - 1]?.controlId) ||
    (element.controlComponent === ControlComponent.PLACEHOLDER &&
      !elementList[index - 1]?.controlId)
  )
}

export function hasControlValueAtIndex(payload: {
  elementList: IElement[]
  index: number
}): boolean {
  const { elementList, index } = payload
  const element = elementList[index]
  if (!element?.controlId) return false
  if (isControlValueComponent(element.controlComponent)) return true
  if (isControlPlaceholderComponent(element.controlComponent)) return false
  if (isControlPrefixComponent(element.controlComponent)) {
    let i = index + 1
    while (i < elementList.length) {
      const nextElement = elementList[i]
      if (element.controlId !== nextElement.controlId) {
        return false
      }
      if (isControlValueComponent(nextElement.controlComponent)) {
        return true
      }
      if (isControlPlaceholderComponent(nextElement.controlComponent)) {
        return false
      }
      i++
    }
  }
  if (isControlSuffixComponent(element.controlComponent)) {
    let i = index - 1
    while (i >= 0) {
      const preElement = elementList[i]
      if (element.controlId !== preElement.controlId) {
        return false
      }
      if (isControlValueComponent(preElement.controlComponent)) {
        return true
      }
      if (isControlPlaceholderComponent(preElement.controlComponent)) {
        return false
      }
      i--
    }
  }
  return false
}

export function resolveStartPlaceholderOnlyControlRange(payload: {
  elementList: IElement[]
  startIndex: number
}): [number, number] | null {
  const { elementList, startIndex } = payload
  const startElement = elementList[startIndex]
  if (
    !startElement?.controlId ||
    !isControlPlaceholderComponent(startElement.controlComponent) ||
    elementList[startIndex - 1]?.controlId
  ) {
    return null
  }
  let endIndex = startIndex
  while (
    endIndex + 1 < elementList.length &&
    elementList[endIndex + 1]?.controlId === startElement.controlId &&
    isControlPlaceholderComponent(elementList[endIndex + 1]?.controlComponent)
  ) {
    endIndex++
  }
  return [startIndex, endIndex]
}

export function isBackspaceRemoveControlStructure(payload: {
  startElement?: IElement | null
  endElement?: IElement | null
}): boolean {
  const { startElement, endElement } = payload
  return (
    isControlPrefixComponent(startElement?.controlComponent) ||
    isControlSuffixComponent(endElement?.controlComponent) ||
    isControlPlaceholderComponent(startElement?.controlComponent)
  )
}

export function isDeleteRemoveControlStructure(payload: {
  startElement?: IElement | null
  endNextElement?: IElement | null
}): boolean {
  const { startElement, endNextElement } = payload
  return (
    (isControlPrefixComponent(startElement?.controlComponent) &&
      isControlPlaceholderComponent(endNextElement?.controlComponent)) ||
    isControlSuffixComponent(endNextElement?.controlComponent) ||
    isControlPlaceholderComponent(startElement?.controlComponent)
  )
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
