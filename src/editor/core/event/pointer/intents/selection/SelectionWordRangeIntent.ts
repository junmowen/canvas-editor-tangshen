import { NUMBER_LIKE_REG } from '../../../../../dataset/constant/Regular'
import { IRange } from '../../../../../interface/Range'
import { getParagraphWordSegmentValue } from '../../../../modules/paragraph/interaction/ParagraphIntentElementPolicy'
import { CanvasEvent } from '../../../CanvasEvent'

function getWordRangeBySegmenter(host: CanvasEvent): IRange | null {
  if (!Intl.Segmenter) return null
  const draw = host.getDraw()
  const components = draw.getComponents()
  const cursorPosition = draw.getCoordinate().getCursorPosition()
  if (!cursorPosition) return null
  const paragraphInfo = components.range.getRangeParagraphInfo()
  if (!paragraphInfo) return null
  const paragraphText =
    paragraphInfo?.elementList
      ?.map(getParagraphWordSegmentValue)
      .join('') || ''
  if (!paragraphText) return null
  const cursorStartIndex = cursorPosition.index
  const offset = paragraphInfo.startIndex
  // 创建 segmenter 实例。
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
  const segments = segmenter.segment(paragraphText)
  let startIndex = -1
  let endIndex = -1
  for (const { segment, index, isWordLike } of segments) {
    const realSegmentStartIndex = index + offset
    if (
      isWordLike &&
      cursorStartIndex >= realSegmentStartIndex &&
      cursorStartIndex < realSegmentStartIndex + segment.length
    ) {
      startIndex = realSegmentStartIndex - 1
      endIndex = startIndex + segment.length
      break
    }
  }
  return ~startIndex && ~endIndex ? { startIndex, endIndex } : null
}

function getWordRangeByCursor(host: CanvasEvent): IRange | null {
  const draw = host.getDraw()
  const cursorPosition = draw.getCoordinate().getCursorPosition()
  if (!cursorPosition) return null
  const { value, index } = cursorPosition
  const elementList = draw.getObjectResolver().getElementList()
  if (index < 0 || index > elementList.length - 1 || !elementList[index]) {
    return null
  }
  // 字母字符匹配正则，用于识别词级选择中的普通字符。
  const LETTER_REG = draw.getLetterReg()
  let upCount = 0
  let downCount = 0
  const isNumber = NUMBER_LIKE_REG.test(value)
  if (isNumber || LETTER_REG.test(value)) {
    let upStartIndex = index - 1
    while (upStartIndex > 0) {
      const currentValue = elementList[upStartIndex]?.value
      if (currentValue === undefined) break
      if (
        (isNumber && NUMBER_LIKE_REG.test(currentValue)) ||
        (!isNumber && LETTER_REG.test(currentValue))
      ) {
        upCount++
        upStartIndex--
      } else {
        break
      }
    }
    let downStartIndex = index + 1
    while (downStartIndex < elementList.length) {
      const currentValue = elementList[downStartIndex]?.value
      if (currentValue === undefined) break
      if (
        (isNumber && NUMBER_LIKE_REG.test(currentValue)) ||
        (!isNumber && LETTER_REG.test(currentValue))
      ) {
        downCount++
        downStartIndex++
      } else {
        break
      }
    }
  }
  const startIndex = index - upCount - 1
  if (startIndex < 0) return null
  return {
    startIndex,
    endIndex: index + downCount
  }
}

export function resolveWordRangeIntent(host: CanvasEvent) {
  return getWordRangeBySegmenter(host) || getWordRangeByCursor(host)
}
