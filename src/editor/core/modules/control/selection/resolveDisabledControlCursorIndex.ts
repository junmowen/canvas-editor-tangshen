import { IElement } from '../../../../interface/Element'

/** 禁用控件被点击时，把光标落点解析到控件结构外侧。 */
export function resolveDisabledControlCursorIndex(
  elementList: IElement[],
  targetElementIndex: number
) {
  const targetElement = elementList[targetElementIndex]
  const controlId = targetElement?.controlId
  if (!controlId) return targetElementIndex

  let controlStartIndex = targetElementIndex
  while (
    controlStartIndex > 0 &&
    elementList[controlStartIndex - 1]?.controlId === controlId
  ) {
    controlStartIndex--
  }

  let controlEndIndex = targetElementIndex
  while (
    controlEndIndex + 1 < elementList.length &&
    elementList[controlEndIndex + 1]?.controlId === controlId
  ) {
    controlEndIndex++
  }

  if (controlStartIndex > 0) {
    return controlStartIndex - 1
  }
  if (controlEndIndex + 1 < elementList.length) {
    return controlEndIndex + 1
  }
  return targetElementIndex
}
