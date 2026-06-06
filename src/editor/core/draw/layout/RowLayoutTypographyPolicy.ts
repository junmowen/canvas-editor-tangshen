import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import {
  isPlainTextElement
} from '../../modules/paragraph/layout/ParagraphRowLayoutPolicy'
import {
  isLineEndForbiddenOpenPunctuation,
  shouldApplyCjkLatinSpacing
} from '../../modules/paragraph/layout/ChineseLineBreakPolicy'
import type { Draw } from '../Draw'

/** 解析当前元素与前一个元素之间的中西文间距。 */
export function resolveCjkLatinSpacing(payload: {
  /** Draw 门面，用于读取排版选项。 */
  draw: Draw
  /** 前一个文档元素，用于判断中文和英文/数字边界。 */
  preElement: IElement | undefined
  /** 当前文档元素。 */
  element: IElement
  /** 当前缩放比例。 */
  scale: number
}) {
  const { draw, preElement, element, scale } = payload
  const spacing = draw.getOptions().typography.cjkLatinSpacing
  if (spacing <= 0 || !shouldApplyCjkLatinSpacing(preElement, element)) {
    return 0
  }
  return spacing * scale
}

/** 把中西文间距追加到前一个元素宽度上，使当前元素自然后移。 */
export function applyCjkLatinSpacingToPreviousElement(payload: {
  /** 当前正在写入的行。 */
  row: IRow
  /** 需要追加的间距宽度。 */
  spacing: number
}) {
  const { row, spacing } = payload
  if (spacing <= 0) return
  const previousRowElement = row.elementList[row.elementList.length - 1]
  if (!previousRowElement?.metrics) return
  previousRowElement.metrics.width += spacing
  row.width += spacing
}

/** 预读开口标点后的首个文本宽度，用于避免开口标点停留在行尾。 */
export function measureOpeningPunctuationNextWidth(payload: {
  /** Draw 门面，用于读取排版选项和文本测量能力。 */
  draw: Draw
  /** 测量上下文。 */
  ctx: CanvasRenderingContext2D
  /** 当前布局元素列表。 */
  elementList: IElement[]
  /** 当前元素索引。 */
  index: number
  /** 当前缩放比例。 */
  scale: number
}) {
  const { draw, ctx, elementList, index, scale } = payload
  const element = elementList[index]
  const nextElement = elementList[index + 1]
  if (
    !isLineEndForbiddenOpenPunctuation(
      element,
      draw.getOptions().typography.openingPunctuationList
    ) ||
    !isPlainTextElement(nextElement)
  ) {
    return 0
  }
  return draw.getTextParticle().measureText(ctx, nextElement).width * scale
}
