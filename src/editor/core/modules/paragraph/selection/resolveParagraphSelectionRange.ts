import { ZERO } from '../../../../dataset/constant/Common'
import { IElement } from '../../../../interface/Element'
import {
  isParagraphEndBoundary,
  isParagraphStartBoundary
} from './ParagraphBoundaryPolicy'

/** 根据光标索引解析段落级选区范围。 */
export function resolveParagraphSelectionRange(payload: {
  /** 文档元素列表。 */
  elementList: IElement[]
  /** 当前光标索引。 */
  index: number
}) {
  const { elementList, index } = payload
  let upCount = 0
  let downCount = 0
  let upStartIndex = index - 1
  while (upStartIndex > 0) {
    const element = elementList[upStartIndex]
    const preElement = elementList[upStartIndex - 1]
    if (isParagraphStartBoundary(element, preElement)) {
      break
    }
    upCount++
    upStartIndex--
  }
  let downStartIndex = index + 1
  while (downStartIndex < elementList.length) {
    const element = elementList[downStartIndex]
    const nextElement = elementList[downStartIndex + 1]
    if (isParagraphEndBoundary(element, nextElement)) {
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
