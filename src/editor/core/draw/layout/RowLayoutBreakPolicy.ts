import { WordBreak } from '../../../dataset/enum/Editor'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { isBlockElement } from '../../modules/block/layout/BlockElementLayout'
import { isChartGraphicElement } from '../../modules/chart-graphics/layout/ChartGraphicElementLayout'
import { shouldBreakBeforeColumnCheckable } from '../../modules/control/layout/CheckableControlElementLayout'
import { shouldBreakAtComplexFormulaBoundary } from '../../modules/formula/layout/FormulaTextElementLayout'
import { isInlineImageElement } from '../../modules/image/layout/InlineImageElementLayout'
import {
  isLineStartForbiddenClosingPunctuation,
  isNumberUnitSuffixElement,
  shouldHangLineEndPunctuation
} from '../../modules/paragraph/layout/ChineseLineBreakPolicy'
import {
  shouldBreakAtZeroParagraphElement
} from '../../modules/paragraph/layout/ParagraphRowLayoutPolicy'
import { isSeparatorElement } from '../../modules/separator/layout/SeparatorElementLayout'
import {
  isInlineTableElement,
  shouldBreakAtTableBoundary
} from '../../modules/table/layout/TableRowLayoutPolicy'
import type { Draw } from '../Draw'
import { isColumnsChanged } from './RowLayoutStatePolicy'

/** 行换行决策结果，主循环只消费最终 wrap 信息和调试字段。 */
export interface IRowLayoutBreakDecision {
  shouldBreakAtFormulaBoundary: boolean
  isForceBreak: boolean
  isWidthNotEnough: boolean
  isWrap: boolean
}

/** 解析当前元素是否需要开启新行。 */
export function resolveRowLayoutBreakDecision(payload: {
  draw: Draw
  elementList: IElement[]
  index: number
  element: IElement
  preElement: IElement | undefined
  curRow: IRow
  curRowWidth: number
  availableWidth: number
  isFromTable: boolean
  wordBreak: WordBreak
}): IRowLayoutBreakDecision {
  const {
    draw,
    elementList,
    index,
    element,
    preElement,
    curRow,
    curRowWidth,
    availableWidth,
    isFromTable,
    wordBreak
  } = payload
  const isInlineTable = isInlineTableElement(element)
  const isPreInlineTable = isInlineTableElement(preElement)
  const shouldBreakAtFormulaBoundary = shouldBreakAtComplexFormulaBoundary({
    element,
    preElement,
    isCurrentRowEmpty: !curRow.elementList.length
  })
  const isForceBreak =
    isSeparatorElement(element) ||
    shouldBreakAtTableBoundary({
      element,
      preElement,
      isInlineTable,
      isPreInlineTable
    }) ||
    isBlockElement(preElement) ||
    isBlockElement(element) ||
    isChartGraphicElement(preElement) ||
    isChartGraphicElement(element) ||
    isInlineImageElement(preElement) ||
    isInlineImageElement(element) ||
    shouldBreakAtFormulaBoundary ||
    isColumnsChanged(preElement, element) ||
    preElement?.listId !== element.listId ||
    (preElement?.areaId !== element.areaId && !element.area?.hide) ||
    shouldBreakBeforeColumnCheckable({ element, preElement }) ||
    (index !== 0 && shouldBreakAtZeroParagraphElement(element))
  const isHangingPunctuation =
    !isFromTable &&
    wordBreak === WordBreak.BREAK_WORD &&
    shouldHangLineEndPunctuation(element) &&
    curRow.width <= availableWidth
  const isLineStartForbiddenClosingPunctuationOverflow =
    !isFromTable &&
    wordBreak === WordBreak.BREAK_WORD &&
    isLineStartForbiddenClosingPunctuation(
      element,
      draw.getOptions().typography.closingPunctuationList
    ) &&
    curRow.width <= availableWidth
  const isHangingNumberUnitSuffix =
    !isFromTable &&
    wordBreak === WordBreak.BREAK_WORD &&
    isNumberUnitSuffixElement(
      elementList,
      index,
      draw.getOptions().typography.numberUnitSuffixList
    )
  const isWidthNotEnough =
    curRowWidth > availableWidth &&
    !isHangingPunctuation &&
    !isLineStartForbiddenClosingPunctuationOverflow &&
    !isHangingNumberUnitSuffix
  const isWrap = isForceBreak || isWidthNotEnough
  return {
    shouldBreakAtFormulaBoundary,
    isForceBreak,
    isWidthNotEnough,
    isWrap
  }
}
