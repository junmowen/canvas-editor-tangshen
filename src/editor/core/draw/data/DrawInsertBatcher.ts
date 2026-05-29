import { IElement } from '../../../interface/Element'
import { isPlainTextElement } from '../../modules/paragraph/layout/ParagraphRowLayoutPolicy'

/** 大批量粘贴异步提交阈值，避免一次输入态 chunk 同步测量数百页。 */
export const ASYNC_INSERT_THRESHOLD = 1000
/** 大批量粘贴每批提交元素数量。 */
const ASYNC_INSERT_BATCH_SIZE = 500
/** 大批量粘贴每批原始文本字符上限，覆盖单个超长文本元素场景。 */
const ASYNC_INSERT_BATCH_TEXT_SIZE = 500
/** Unicode 低代理项起点。 */
const LOW_SURROGATE_START = 0xdc00
/** Unicode 低代理项终点。 */
const LOW_SURROGATE_END = 0xdfff
/** Unicode 高代理项起点。 */
const HIGH_SURROGATE_START = 0xd800
/** Unicode 高代理项终点。 */
const HIGH_SURROGATE_END = 0xdbff
/** 零宽连接符，emoji family 等序列不能从这里切开。 */
const ZERO_WIDTH_JOINER_CODE = 0x200d
/** tag sequence 取消标签，用于判断黑旗等 emoji 标签序列是否闭合。 */
const CANCEL_TAG_CODE_POINT = 0xe007f

/** 估算格式化前输入体量；长字符串元素会在格式化时拆成大量文本节点。 */
export function getRawInsertWeight(elementList: IElement[]) {
  return elementList.reduce((weight, element) => {
    return weight + Math.max(1, element.value?.length || 0)
  }, elementList.length)
}

/** 创建原始插入批次，既限制元素数，也限制单批文本量。 */
export function createRawInsertBatchList(elementList: IElement[]) {
  const batchList: IElement[][] = []
  // 初始化 current Batch 列表。
  let currentBatch: IElement[] = []
  let currentTextSize = 0

  const pushCurrentBatch = () => {
    if (!currentBatch.length) {
      return
    }
    batchList.push(currentBatch)
    currentBatch = []
    currentTextSize = 0
  }

  const pushElement = (element: IElement) => {
    const textSize = Math.max(1, element.value?.length || 0)
    if (
      currentBatch.length >= ASYNC_INSERT_BATCH_SIZE ||
      currentTextSize + textSize > ASYNC_INSERT_BATCH_TEXT_SIZE
    ) {
      pushCurrentBatch()
    }
    currentBatch.push(element)
    currentTextSize += textSize
  }

  for (let index = 0; index < elementList.length; index++) {
    const element = elementList[index]
    if (
      isPlainTextElement(element) &&
      element.value?.length > ASYNC_INSERT_BATCH_TEXT_SIZE
    ) {
      pushCurrentBatch()
      let offset = 0
      while (offset < element.value.length) {
        const nextOffset = resolveSafeTextBatchEndIndex(
          element.value,
          offset,
          ASYNC_INSERT_BATCH_TEXT_SIZE
        )
        batchList.push([
          {
            ...element,
            value: element.value.slice(offset, nextOffset)
          }
        ])
        offset = nextOffset
      }
    } else {
      pushElement(element)
    }
  }
  pushCurrentBatch()
  return batchList
}

/** 解析安全文本分批边界，只检查切点附近，避免首帧对全文做 Intl.Segmenter。 */
function resolveSafeTextBatchEndIndex(
  value: string,
  startIndex: number,
  preferredSize: number
) {
  let endIndex = Math.min(value.length, startIndex + preferredSize)
  if (endIndex >= value.length) {
    return value.length
  }
  while (
    endIndex > startIndex + 1 &&
    !isSafeTextBatchBoundary(value, endIndex)
  ) {
    endIndex--
  }
  return endIndex > startIndex
    ? endIndex
    : Math.min(value.length, startIndex + preferredSize)
}

/** 判断分批边界是否不会切开常见 Unicode 组合序列。 */
function isSafeTextBatchBoundary(value: string, index: number) {
  const previousCode = value.charCodeAt(index - 1)
  const currentCode = value.charCodeAt(index)
  if (isLowSurrogate(currentCode) || isHighSurrogate(previousCode)) {
    return false
  }
  if (isCombiningMark(currentCode) || isVariationSelector(currentCode)) {
    return false
  }
  if (isEmojiSkinToneModifierAt(value, index)) {
    return false
  }
  if (isRegionalIndicatorBoundaryUnsafe(value, index)) {
    return false
  }
  if (isTagSequenceBoundaryUnsafe(value, index)) {
    return false
  }
  if (
    previousCode === ZERO_WIDTH_JOINER_CODE ||
    currentCode === ZERO_WIDTH_JOINER_CODE
  ) {
    return false
  }
  return true
}

/** 是否是 UTF-16 高代理项。 */
function isHighSurrogate(code: number) {
  return code >= HIGH_SURROGATE_START && code <= HIGH_SURROGATE_END
}

/** 是否是 UTF-16 低代理项。 */
function isLowSurrogate(code: number) {
  return code >= LOW_SURROGATE_START && code <= LOW_SURROGATE_END
}

/** 是否是常见组合音标。 */
function isCombiningMark(code: number) {
  return (
    (code >= 0x0300 && code <= 0x036f) ||
    (code >= 0x1ab0 && code <= 0x1aff) ||
    (code >= 0x1dc0 && code <= 0x1dff) ||
    (code >= 0x20d0 && code <= 0x20ff) ||
    (code >= 0xfe20 && code <= 0xfe2f)
  )
}

/** 是否是变体选择符。 */
function isVariationSelector(code: number) {
  return code === 0xfe0e || code === 0xfe0f
}

/** 是否从当前位置开始是 emoji 肤色修饰符代理对。 */
function isEmojiSkinToneModifierAt(value: string, index: number) {
  return (
    value.charCodeAt(index) === 0xd83c &&
    value.charCodeAt(index + 1) >= 0xdffb &&
    value.charCodeAt(index + 1) <= 0xdfff
  )
}

/** 区域旗帜由两个 regional indicator 组成，不能切在两个 indicator 中间。 */
function isRegionalIndicatorBoundaryUnsafe(value: string, index: number) {
  const previousCodePoint = value.codePointAt(index - 2)
  const currentCodePoint = value.codePointAt(index)
  return (
    isRegionalIndicatorCodePoint(previousCodePoint) &&
    isRegionalIndicatorCodePoint(currentCodePoint)
  )
}

/** 是否是 regional indicator code point。 */
function isRegionalIndicatorCodePoint(codePoint: number | undefined) {
  return (
    codePoint !== undefined &&
    codePoint >= 0x1f1e6 &&
    codePoint <= 0x1f1ff
  )
}

/** tag sequence 从黑旗开始到 cancel tag 结束，序列内部不能切开。 */
function isTagSequenceBoundaryUnsafe(value: string, index: number) {
  const searchStart = Math.max(0, index - 64)
  const previousBlackFlagIndex = value.lastIndexOf('🏴', index - 1)
  if (previousBlackFlagIndex < searchStart) {
    return false
  }
  const cancelTag = String.fromCodePoint(CANCEL_TAG_CODE_POINT)
  const previousCancelTagIndex = value.lastIndexOf(cancelTag, index - 1)
  if (previousCancelTagIndex > previousBlackFlagIndex) {
    return false
  }
  const nextCancelTagIndex = value.indexOf(cancelTag, index)
  return (
    nextCancelTagIndex >= 0 &&
    nextCancelTagIndex - previousBlackFlagIndex <= 64
  )
}
