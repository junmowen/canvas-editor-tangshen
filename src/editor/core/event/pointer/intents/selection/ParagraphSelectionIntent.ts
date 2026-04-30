import { ZERO } from '../../../../../dataset/constant/Common'
import { CanvasEvent } from '../../../CanvasEvent'

export function resolveParagraphSelectionIntent(host: CanvasEvent) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  const cursorPosition = components.position.getCursorPosition()
  if (!cursorPosition) return null
  const { index } = cursorPosition
  const elementList = draw.getElementList()
  let upCount = 0
  let downCount = 0
  let upStartIndex = index - 1
  while (upStartIndex > 0) {
    const element = elementList[upStartIndex]
    const preElement = elementList[upStartIndex - 1]
    if (
      (element.value === ZERO && !element.listWrap) ||
      element.listId !== preElement?.listId ||
      element.titleId !== preElement?.titleId
    ) {
      break
    }
    upCount++
    upStartIndex--
  }
  let downStartIndex = index + 1
  while (downStartIndex < elementList.length) {
    const element = elementList[downStartIndex]
    const nextElement = elementList[downStartIndex + 1]
    if (
      (element.value === ZERO && !element.listWrap) ||
      element.listId !== nextElement?.listId ||
      element.titleId !== nextElement?.titleId
    ) {
      break
    }
    downCount++
    downStartIndex++
  }
  let startIndex = index - upCount - 1
  if (elementList[startIndex]?.value !== ZERO) {
    startIndex -= 1
  }
  if (startIndex < 0) return null
  let endIndex = index + downCount + 1
  if (elementList[endIndex]?.value === ZERO || endIndex > elementList.length - 1) {
    endIndex -= 1
  }
  return {
    startIndex,
    endIndex
  }
}
