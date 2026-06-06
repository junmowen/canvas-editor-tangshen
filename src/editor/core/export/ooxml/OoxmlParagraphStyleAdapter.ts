import { IElement } from '../../../interface/Element'
import {
  createOoxmlBookmarkName,
  createOoxmlStableNumber
} from './OoxmlCommon'
import {
  hasOoxmlVisibleListElement,
  isOoxmlVisibleParagraphElement
} from './OoxmlParagraphBoundaryAdapter'

export type TOoxmlParagraphPropertiesMatcher = (element?: IElement) => boolean

/** 判断元素是否携带标题、书签或显式段落样式这类语义样式。 */
function hasOoxmlSemanticParagraphStyle(element?: IElement) {
  return !!(
    element?.level ||
    element?.styleId ||
    element?.titleId ||
    element?.title
  )
}

/** 判断段落可见内容是否已经明确属于标题或显式段落样式。 */
function hasOoxmlVisibleSemanticStyleElement(elementList: IElement[]) {
  return elementList.some(hasOoxmlSemanticParagraphStyle)
}

/** 删除列表上下文字段，避免段落结束符把相邻标题误导出成列表项。 */
function omitOoxmlListProperties(element: IElement) {
  const styleElement = { ...element }
  delete styleElement.listId
  delete styleElement.listType
  delete styleElement.listStyle
  delete styleElement.listLevel
  delete styleElement.listStart
  delete styleElement.listSymbol
  delete styleElement.listWrap
  return styleElement
}

/** 删除标题和显式段落样式，避免段落结束符把普通文本导出成标题段。 */
function omitOoxmlSemanticParagraphProperties(element: IElement) {
  const styleElement = { ...element }
  delete styleElement.level
  delete styleElement.styleId
  delete styleElement.styleName
  delete styleElement.titleId
  delete styleElement.title
  return styleElement
}

/** 判断当前段落是否同时包含标题语义和普通可见文本。 */
function hasOoxmlMixedSemanticAndPlainContent(elementList: IElement[]) {
  const hasSemantic = hasOoxmlVisibleSemanticStyleElement(elementList)
  const hasPlain = elementList.some(
    element =>
      isOoxmlVisibleParagraphElement(element) &&
      !hasOoxmlSemanticParagraphStyle(element)
  )
  return hasSemantic && hasPlain
}

/** 清理段落结束符里不应跨段继承的列表和标题语义属性。 */
function normalizeOoxmlParagraphEndStyleElement(
  elementList: IElement[],
  paragraphEndElement: IElement
) {
  let styleElement = paragraphEndElement
  if (styleElement.listId && !hasOoxmlVisibleListElement(elementList)) {
    styleElement = omitOoxmlListProperties(styleElement)
  }
  if (
    hasOoxmlSemanticParagraphStyle(styleElement) &&
    (!hasOoxmlVisibleSemanticStyleElement(elementList) ||
      hasOoxmlMixedSemanticAndPlainContent(elementList))
  ) {
    styleElement = omitOoxmlSemanticParagraphProperties(styleElement)
  }
  return styleElement
}

/** 清理可见段混排时不应应用到整段的标题语义样式。 */
function normalizeOoxmlVisibleStyleElement(
  elementList: IElement[],
  visibleStyleElement?: IElement
) {
  if (
    visibleStyleElement &&
    hasOoxmlSemanticParagraphStyle(visibleStyleElement) &&
    hasOoxmlMixedSemanticAndPlainContent(elementList)
  ) {
    return omitOoxmlSemanticParagraphProperties(visibleStyleElement)
  }
  return visibleStyleElement
}

/** 解析段落属性来源，列表和标题语义必须来自当前段可见内容。 */
export function resolveOoxmlParagraphStyleElement(
  elementList: IElement[],
  paragraphEndElement: IElement | undefined,
  hasParagraphProperties: TOoxmlParagraphPropertiesMatcher
) {
  const visibleStyleElement =
    elementList.find(hasParagraphProperties) || elementList[0]
  if (!paragraphEndElement || !hasParagraphProperties(paragraphEndElement)) {
    return normalizeOoxmlVisibleStyleElement(elementList, visibleStyleElement)
  }
  if (!elementList.length) {
    return paragraphEndElement
  }
  return normalizeOoxmlParagraphEndStyleElement(elementList, paragraphEndElement)
}

/** 判断段落属性数值是否可导出。 */
export function isOoxmlParagraphMetricValue(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
}

/** 解析标题书签导出信息，只有携带 titleId 的段落需要写入。 */
export function resolveOoxmlParagraphBookmark(element?: IElement) {
  if (!element?.titleId) return undefined
  const id = createOoxmlStableNumber(element.titleId)
  return {
    id,
    name: createOoxmlBookmarkName(element.titleId)
  }
}
