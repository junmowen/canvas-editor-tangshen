import { ZERO } from '../../../dataset/constant/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'

/** 判断空 value 的行内元素是否仍需要进入 OOXML 段落流。 */
export function shouldKeepEmptyOoxmlInlineElement(element: IElement) {
  return (
    !!element.type &&
    element.type !== ElementType.TEXT &&
    element.type !== ElementType.TABLE
  )
}

/** 判断元素是否会在段落内形成可见内容或独立行内对象。 */
export function isOoxmlVisibleParagraphElement(element: IElement) {
  const value = (element.value || '').replace(new RegExp(ZERO, 'g'), '')
  return !!value || shouldKeepEmptyOoxmlInlineElement(element)
}

/** 判断当前文本片段后是否跟着显式 ZERO 段落结束符。 */
export function hasOoxmlZeroParagraphBoundary(
  valuePartList: string[],
  partIndex: number
) {
  return partIndex < valuePartList.length - 1
}

/** 按显式 ZERO 段落符拆分元素文本。 */
export function splitOoxmlParagraphValueByZero(value: string) {
  return value.split(ZERO)
}

/** 判断段落可见内容是否已经明确属于列表。 */
export function hasOoxmlVisibleListElement(elementList: IElement[]) {
  return elementList.some(element => !!element.listId)
}

/** 判断当前元素与已收集段落之间是否需要强制切段，避免列表和标题互相吞并。 */
function shouldBreakOoxmlParagraphBeforeElement(
  currentElementList: IElement[],
  element: IElement
) {
  if (!currentElementList.length || !isOoxmlVisibleParagraphElement(element)) {
    return false
  }
  const currentHasList = hasOoxmlVisibleListElement(currentElementList)
  const currentHasNonList = currentElementList.some(item => !item.listId)
  const nextHasList = !!element.listId

  if (currentHasList && !nextHasList) {
    return true
  }
  if (!currentHasList && currentHasNonList && nextHasList) {
    return true
  }
  return (
    currentHasList &&
    nextHasList &&
    currentElementList.some(
      item => item.listId && item.listId !== element.listId
    )
  )
}

/** 判断当前元素是否触发没有 ZERO 的隐式段落边界。 */
export function shouldCreateImplicitOoxmlParagraphBoundary(
  currentElementList: IElement[],
  element: IElement
) {
  return shouldBreakOoxmlParagraphBeforeElement(currentElementList, element)
}

/** 判断当前元素在 body 流里应作为块级表格还是段内行内内容处理。 */
export function resolveOoxmlBodyContentElementKind(element: IElement) {
  return element.type === ElementType.TABLE ? 'table' : 'inline'
}

/** 判断空累计段落是否应跳过，避免页眉/正文顶部多出占位空段。 */
export function shouldSkipOoxmlEmptyParagraphFlush(
  currentElementList: IElement[],
  paragraphList: unknown[]
) {
  return !currentElementList.length && !paragraphList.length
}
