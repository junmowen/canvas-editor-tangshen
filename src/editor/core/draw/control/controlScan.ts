import { IElement } from '../../../interface/Element'

export function resolveControlBlockEndIndex(payload: {
  elementList: IElement[]
  startIndex: number
  controlId: string
}): number {
  const { elementList, startIndex, controlId } = payload
  let endIndex = startIndex
  while (endIndex < elementList.length) {
    const nextElement = elementList[endIndex]
    if (nextElement.controlId !== controlId) break
    endIndex++
  }
  return endIndex
}
