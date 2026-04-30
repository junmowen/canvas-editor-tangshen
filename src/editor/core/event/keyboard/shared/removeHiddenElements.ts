import { CanvasEvent } from '../../CanvasEvent'

export function removeHiddenElements(
  host: CanvasEvent,
  direction: 'prev' | 'next'
) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  const rangeManager = components.range
  const range = rangeManager.getEditBoundaryRange()
  const elementList = draw.getElementList()
  const startIndex =
    direction === 'prev' ? range.startIndex : range.startIndex + 1
  const startElement = elementList[startIndex]
  if (
    !startElement ||
    (!startElement.hide &&
      !startElement.control?.hide &&
      !startElement.area?.hide)
  ) {
    return
  }

  let index = startIndex
  while (direction === 'prev' ? index > 0 : index < elementList.length) {
    const currentElement = elementList[index]
    let newIndex: number | null = null
    if (currentElement.controlId) {
      newIndex = components.control.removeControl(index)
      if (direction === 'prev' && newIndex !== null) {
        index = newIndex
      }
    } else {
      draw.spliceElementList(elementList, index, 1)
      newIndex = direction === 'prev' ? index - 1 : index
      if (direction === 'prev') {
        index--
      }
    }
    const nextElement = elementList[newIndex!]
    if (
      !nextElement ||
      (!nextElement.hide &&
        !nextElement.control?.hide &&
        !nextElement.area?.hide)
    ) {
      if (direction === 'prev' && newIndex) {
        range.startIndex = newIndex
        range.endIndex = newIndex
        rangeManager.replaceRange(range)
        const position = components.position
        const positionList = position.getPositionList()
        position.setCursorPosition(positionList[newIndex])
      }
      break
    }
  }
}
