import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

/** 根据 payload 创建带相同 hyperlinkId 的超链接元素列表。 */
export function createHyperlinkElementList(
  payload: IElement,
  hyperlinkId: string
) {
  const { valueList, url } = payload
  return valueList?.map<IElement>(element => ({
    ...element,
    url,
    hyperlinkId,
    value: element.value,
    type: ElementType.HYPERLINK
  })) || null
}

/** 根据候选元素解析完整超链接范围。 */
export function resolveHyperlinkRangeFromCandidates(payload: {
  /** 文档元素列表。 */
  elementList: IElement[]
  /** 候选元素列表。 */
  candidateElementList: Array<IElement | null | undefined>
}): [number, number] | null {
  const { elementList, candidateElementList } = payload
  const matchedElement = candidateElementList.find(
    element => element?.type === ElementType.HYPERLINK
  )
  if (!matchedElement?.hyperlinkId) return null
  const hyperlinkId = matchedElement.hyperlinkId
  const startIndex = elementList.indexOf(matchedElement)
  if (startIndex < 0) return null

  let leftIndex = startIndex
  let rightIndex = startIndex
  let preIndex = startIndex - 1
  while (preIndex >= 0) {
    const preElement = elementList[preIndex]
    if (preElement.hyperlinkId !== hyperlinkId) {
      break
    }
    leftIndex = preIndex
    preIndex--
  }

  let nextIndex = startIndex + 1
  while (nextIndex < elementList.length) {
    const nextElement = elementList[nextIndex]
    if (nextElement.hyperlinkId !== hyperlinkId) {
      break
    }
    rightIndex = nextIndex
    nextIndex++
  }
  if (nextIndex === elementList.length) {
    rightIndex = nextIndex - 1
  }
  if (!~leftIndex || !~rightIndex) return null
  return [leftIndex, rightIndex]
}

/** 取消超链接但保留文本内容。 */
export function clearHyperlinkAttrs(
  elementList: IElement[],
  leftIndex: number,
  rightIndex: number
) {
  for (let i = leftIndex; i <= rightIndex; i++) {
    const element = elementList[i]
    delete element.type
    delete element.url
    delete element.hyperlinkId
    delete element.underline
  }
}

/** 更新超链接地址。 */
export function updateHyperlinkUrl(
  elementList: IElement[],
  leftIndex: number,
  rightIndex: number,
  url: string
) {
  for (let i = leftIndex; i <= rightIndex; i++) {
    elementList[i].url = url
  }
}
