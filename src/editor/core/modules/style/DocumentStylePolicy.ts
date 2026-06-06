import { TitleLevel } from '../../../dataset/enum/Title'
import { IElement } from '../../../interface/Element'
import { IDocumentListStyle, IDocumentStyle } from '../../../interface/Style'

/** 内置标题层级到文档样式 id 的映射。 */
const TITLE_LEVEL_STYLE_ID_MAP: Record<TitleLevel, string> = {
  [TitleLevel.FIRST]: 'Heading1',
  [TitleLevel.SECOND]: 'Heading2',
  [TitleLevel.THIRD]: 'Heading3',
  [TitleLevel.FOURTH]: 'Heading4',
  [TitleLevel.FIFTH]: 'Heading5',
  [TitleLevel.SIXTH]: 'Heading6'
}

/** 段落样式支持的第一批字段。 */
const PARAGRAPH_STYLE_KEYS = [
  'rowFlex',
  'rowMargin',
  'rowIndentLeft',
  'rowIndentRight',
  'rowIndent',
  'rowHangingIndent',
  'columns',
  'spaceBefore',
  'spaceAfter',
  'lineSpacing',
  'lineSpacingType',
  'pageBreakBefore',
  'keepWithNext',
  'keepLines',
  'widowControl',
  'tabStops'
] as const

/** 字符样式支持的第一批字段。 */
const TEXT_STYLE_KEYS = [
  'font',
  'size',
  'bold',
  'color',
  'highlight',
  'italic',
  'underline',
  'strikeout',
  'letterSpacing',
  'textDecoration',
  'textScale',
  'textPosition',
  'textOutline',
  'textShadow',
  'textGlow',
  'textReflection',
  'textEnclosure',
  'textRuby',
  'textCombine'
] as const

/** 列表样式支持的第一批字段。 */
const LIST_STYLE_KEYS = [
  'listType',
  'listStyle',
  'listLevel',
  'listStart',
  'listSymbol',
  'listWrap'
] as const

/** 归一化样式 id，空值按 Normal 兜底。 */
export function normalizeDocumentStyleId(styleId: string | null | undefined) {
  const normalized = (styleId || '').trim()
  return normalized || 'Normal'
}

/** 查找样式定义，id 比较时忽略首尾空白。 */
export function findDocumentStyle(
  styles: IDocumentStyle[] | undefined,
  styleId: string | null | undefined
) {
  const normalizedStyleId = normalizeDocumentStyleId(styleId)
  return (styles || []).find(
    style => normalizeDocumentStyleId(style.id) === normalizedStyleId
  )
}

/** 只合并显式定义的字段，避免 undefined 覆盖父样式。 */
function mergeDefined<T extends object>(...sourceList: Array<Partial<T> | undefined>) {
  const result: Partial<T> = {}
  sourceList.forEach(source => {
    if (!source) return
    Object.entries(source).forEach(([key, value]) => {
      if (value !== undefined) {
        ;(result as Record<string, unknown>)[key] = value
      }
    })
  })
  return result
}

/** 从元素上提取样式支持字段。 */
function pickElementStyleFields<K extends readonly (keyof IElement)[]>(
  element: IElement,
  keyList: K
) {
  const result: Partial<IElement> = {}
  keyList.forEach(key => {
    const value = element[key]
    if (value !== undefined) {
      ;(result as Record<keyof IElement, IElement[keyof IElement]>)[key] = value
    }
  })
  return result
}

/** 解析样式继承链，子样式覆盖父样式，并防止循环继承卡死。 */
export function resolveDocumentStyleCascade(
  styles: IDocumentStyle[] | undefined,
  styleId: string | null | undefined,
  visiting = new Set<string>()
): IDocumentStyle | null {
  const style = findDocumentStyle(styles, styleId)
  if (!style) return null

  const normalizedStyleId = normalizeDocumentStyleId(style.id)
  if (visiting.has(normalizedStyleId)) {
    return {
      ...style,
      paragraph: { ...(style.paragraph || {}) },
      text: { ...(style.text || {}) },
      list: { ...(style.list || {}) },
      table: { ...(style.table || {}) }
    }
  }
  visiting.add(normalizedStyleId)
  const baseStyle = style.basedOn
    ? resolveDocumentStyleCascade(styles, style.basedOn, visiting)
    : null
  visiting.delete(normalizedStyleId)

  return {
    ...baseStyle,
    ...style,
    id: style.id,
    name: style.name ?? baseStyle?.name,
    type: style.type ?? baseStyle?.type ?? 'paragraph',
    paragraph: mergeDefined<IElement>(baseStyle?.paragraph, style.paragraph),
    text: mergeDefined<IElement>(baseStyle?.text, style.text),
    list: mergeDefined<IDocumentListStyle>(baseStyle?.list, style.list),
    table: mergeDefined(baseStyle?.table, style.table)
  }
}

/** 解析元素最终格式：样式继承结果在前，元素直接格式在后。 */
export function resolveElementStyleWithDocumentStyle(payload: {
  element: IElement
  styles?: IDocumentStyle[]
}) {
  const { element, styles } = payload
  const resolvedStyle = element.styleId
    ? resolveDocumentStyleCascade(styles, element.styleId)
    : null
  return mergeDefined<IElement>(
    resolvedStyle?.paragraph,
    resolvedStyle?.text,
    resolvedStyle?.list,
    pickElementStyleFields(element, PARAGRAPH_STYLE_KEYS),
    pickElementStyleFields(element, TEXT_STYLE_KEYS),
    pickElementStyleFields(element, LIST_STYLE_KEYS),
    {
      styleId: element.styleId,
      styleName: element.styleName
    }
  )
}

/** 把指定文档样式应用到元素，返回新对象，调用方可写回选区或段落。 */
export function applyDocumentStyleToElement(
  element: IElement,
  styles: IDocumentStyle[] | undefined,
  styleId: string
): IElement {
  const style = resolveDocumentStyleCascade(styles, styleId)
  if (!style) return { ...element }
  return {
    ...element,
    ...style.paragraph,
    ...style.text,
    ...style.list,
    styleId: normalizeDocumentStyleId(style.id),
    styleName: style.name || style.id
  }
}

/** 清除元素和文档样式的关联，保留已经存在的直接格式。 */
export function clearDocumentStyleFromElement(element: IElement): IElement {
  const nextElement = { ...element }
  delete nextElement.styleId
  delete nextElement.styleName
  return nextElement
}

/** 识别当前元素所属样式，用于工具栏和右侧面板回显。 */
export function resolveElementCurrentStyleId(
  element: IElement | null | undefined,
  styles?: IDocumentStyle[]
) {
  if (!element) return 'Normal'
  if (element.styleId && findDocumentStyle(styles, element.styleId)) {
    return normalizeDocumentStyleId(element.styleId)
  }
  if (element.styleId) {
    return normalizeDocumentStyleId(element.styleId)
  }
  if (element.level) {
    return TITLE_LEVEL_STYLE_ID_MAP[element.level] || 'Normal'
  }
  return 'Normal'
}
