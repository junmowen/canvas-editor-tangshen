import { RowFlex } from '../../../dataset/enum/Row'
import { TitleLevel } from '../../../dataset/enum/Title'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { IDocumentStyle } from '../../../interface/Style'
import {
  convertFontSizeToHalfPoint,
  convertPxToTwip,
  normalizeOoxmlHexColor
} from './OoxmlUnit'

/** 标题层级到 Word 内置 Heading 样式 id 的映射。 */
const TITLE_LEVEL_STYLE_ID_MAP: Record<TitleLevel, string> = {
  [TitleLevel.FIRST]: 'Heading1',
  [TitleLevel.SECOND]: 'Heading2',
  [TitleLevel.THIRD]: 'Heading3',
  [TitleLevel.FOURTH]: 'Heading4',
  [TitleLevel.FIFTH]: 'Heading5',
  [TitleLevel.SIXTH]: 'Heading6'
}

/** 标题层级到 OOXML half-point 字号的映射。 */
const TITLE_LEVEL_SIZE_MAP: Record<TitleLevel, number> = {
  [TitleLevel.FIRST]: 52,
  [TitleLevel.SECOND]: 48,
  [TitleLevel.THIRD]: 44,
  [TitleLevel.FOURTH]: 40,
  [TitleLevel.FIFTH]: 36,
  [TitleLevel.SIXTH]: 32
}

/** 样式 XML 命名空间。 */
const STYLE_NAMESPACES =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

/** 转义样式名称，避免自定义样式名破坏 XML 属性。 */
function escapeOoxmlStyleText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 清理自定义样式 id，避免非法字符写入 OOXML 属性。 */
function normalizeOoxmlStyleId(value: string) {
  const styleId = value.replace(/[^A-Za-z0-9_-]/g, '')
  return styleId || 'Normal'
}

/** 解析段落样式 id，优先使用显式 styleId，其次用标题层级映射。 */
export function resolveOoxmlParagraphStyleId(element?: IElement) {
  if (!element) return ''
  if (element.styleId) {
    return normalizeOoxmlStyleId(element.styleId)
  }
  if (element.level) {
    return TITLE_LEVEL_STYLE_ID_MAP[element.level] || ''
  }
  return ''
}

/** 生成 Normal 基础样式。 */
function createOoxmlNormalStyle(options?: IEditorOption) {
  const runProperties = createOoxmlDefaultRunProperties(options)
  return `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr>${runProperties}</w:rPr></w:style>`
}

/** 生成单个 Heading 样式。 */
function createOoxmlHeadingStyle(level: TitleLevel, options?: IEditorOption) {
  const styleId = TITLE_LEVEL_STYLE_ID_MAP[level]
  const headingNo = styleId.replace('Heading', '')
  const size = TITLE_LEVEL_SIZE_MAP[level]
  const fontProperties = createOoxmlDefaultFontProperties(options)
  return `<w:style w:type="paragraph" w:styleId="${styleId}"><w:name w:val="heading ${headingNo}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="${Number(headingNo) * 10}"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr>${fontProperties}<w:b/><w:sz w:val="${size}"/></w:rPr></w:style>`
}

/** 判断数值是否可写入 OOXML 度量属性。 */
function isOoxmlStyleMetricValue(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
}

/** 把内部段落对齐方式映射为 OOXML jc。 */
function getOoxmlStyleJustification(rowFlex?: RowFlex) {
  switch (rowFlex) {
    case RowFlex.CENTER:
      return 'center'
    case RowFlex.RIGHT:
      return 'right'
    case RowFlex.ALIGNMENT:
    case RowFlex.JUSTIFY:
      return 'both'
    default:
      return ''
  }
}

/** 生成样式段落缩进。 */
function createOoxmlStyleParagraphIndent(style?: Partial<IElement>) {
  if (!style) return ''
  const left = Math.max(0, style.rowIndentLeft || 0)
  const right = Math.max(0, style.rowIndentRight || 0)
  const firstLine = Math.max(0, style.rowIndent || 0)
  const hanging = Math.max(0, style.rowHangingIndent || 0)
  const firstLineOffset = left + firstLine
  const followingLineOffset = left + hanging
  const properties: string[] = []
  if (!left && !right && !firstLine && !hanging) return ''
  properties.push(`w:left="${convertPxToTwip(followingLineOffset)}"`)
  if (right) {
    properties.push(`w:right="${convertPxToTwip(right)}"`)
  }
  if (firstLineOffset > followingLineOffset) {
    properties.push(
      `w:firstLine="${convertPxToTwip(firstLineOffset - followingLineOffset)}"`
    )
  } else if (followingLineOffset > firstLineOffset) {
    properties.push(
      `w:hanging="${convertPxToTwip(followingLineOffset - firstLineOffset)}"`
    )
  }
  return `<w:ind ${properties.join(' ')}/>`
}

/** 生成样式段落间距和行距。 */
function createOoxmlStyleParagraphSpacing(style?: Partial<IElement>) {
  if (!style) return ''
  const properties: string[] = []
  if (isOoxmlStyleMetricValue(style.spaceBefore)) {
    properties.push(`w:before="${convertPxToTwip(style.spaceBefore)}"`)
  }
  if (isOoxmlStyleMetricValue(style.spaceAfter)) {
    properties.push(`w:after="${convertPxToTwip(style.spaceAfter)}"`)
  }
  if (isOoxmlStyleMetricValue(style.lineSpacing) && style.lineSpacing! > 0) {
    if (style.lineSpacingType === 'multiple') {
      properties.push(`w:line="${Math.max(1, Math.round(style.lineSpacing! * 240))}"`)
      properties.push('w:lineRule="auto"')
    } else {
      properties.push(`w:line="${convertPxToTwip(style.lineSpacing)}"`)
      properties.push(
        `w:lineRule="${style.lineSpacingType === 'auto' ? 'auto' : 'exact'}"`
      )
    }
  }
  return properties.length ? `<w:spacing ${properties.join(' ')}/>` : ''
}

/** 把内部制表位对齐方式映射为 OOXML tab val。 */
function getOoxmlStyleTabAlignment(alignment?: string) {
  switch (alignment) {
    case 'right':
    case 'center':
    case 'decimal':
    case 'bar':
      return alignment
    default:
      return 'left'
  }
}

/** 生成样式制表位。 */
function createOoxmlStyleParagraphTabs(style?: Partial<IElement>) {
  const tabStops = (style?.tabStops || [])
    .filter(tabStop => isOoxmlStyleMetricValue(tabStop.position))
    .sort((left, right) => left.position - right.position)
  if (!tabStops.length) return ''
  const tabXml = tabStops
    .map(
      tabStop =>
        `<w:tab w:val="${getOoxmlStyleTabAlignment(tabStop.alignment)}" w:pos="${convertPxToTwip(tabStop.position)}"/>`
    )
    .join('')
  return `<w:tabs>${tabXml}</w:tabs>`
}

/** 生成样式段落分页控制。 */
function createOoxmlStyleParagraphPagination(style?: Partial<IElement>) {
  if (!style) return []
  const properties: string[] = []
  if (style.pageBreakBefore) properties.push('<w:pageBreakBefore/>')
  if (style.keepWithNext) properties.push('<w:keepNext/>')
  if (style.keepLines) properties.push('<w:keepLines/>')
  if (style.widowControl) properties.push('<w:widowControl/>')
  return properties
}

/** 生成样式段落属性。 */
function createOoxmlStyleParagraphProperties(style?: Partial<IElement>) {
  if (!style) return ''
  const justify = getOoxmlStyleJustification(style.rowFlex)
  const properties: string[] = []
  if (justify) {
    properties.push(`<w:jc w:val="${justify}"/>`)
  }
  const tabs = createOoxmlStyleParagraphTabs(style)
  if (tabs) properties.push(tabs)
  const spacing = createOoxmlStyleParagraphSpacing(style)
  if (spacing) properties.push(spacing)
  const indent = createOoxmlStyleParagraphIndent(style)
  if (indent) properties.push(indent)
  properties.push(...createOoxmlStyleParagraphPagination(style))
  return properties.length ? `<w:pPr>${properties.join('')}</w:pPr>` : ''
}

/** 生成布尔型 run 样式节点，false 用 w:val=0 覆盖父样式。 */
function createOoxmlStyleBooleanRunProperty(tag: string, value: boolean | undefined) {
  if (value === undefined) return ''
  return value ? `<w:${tag}/>` : `<w:${tag} w:val="0"/>`
}

/** 生成样式字符属性。 */
function createOoxmlStyleRunProperties(style?: Partial<IElement>) {
  if (!style) return ''
  const properties: string[] = []
  if (style.font) {
    const font = escapeOoxmlStyleText(style.font)
    properties.push(
      `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`
    )
  }
  if (style.size) {
    const size = convertFontSizeToHalfPoint(style.size)
    properties.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`)
  }
  properties.push(createOoxmlStyleBooleanRunProperty('b', style.bold))
  properties.push(createOoxmlStyleBooleanRunProperty('i', style.italic))
  if (style.underline !== undefined) {
    properties.push(
      style.underline ? '<w:u w:val="single"/>' : '<w:u w:val="none"/>'
    )
  }
  properties.push(createOoxmlStyleBooleanRunProperty('strike', style.strikeout))
  if (style.color) {
    properties.push(`<w:color w:val="${normalizeOoxmlHexColor(style.color)}"/>`)
  }
  if (style.highlight) {
    properties.push(
      `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeOoxmlHexColor(style.highlight)}"/>`
    )
  }
  if (isOoxmlStyleMetricValue(style.letterSpacing)) {
    properties.push(`<w:spacing w:val="${convertPxToTwip(style.letterSpacing)}"/>`)
  }
  if (typeof style.textScale === 'number' && Number.isFinite(style.textScale)) {
    properties.push(`<w:w w:val="${Math.max(1, Math.round(style.textScale))}"/>`)
  }
  if (isOoxmlStyleMetricValue(style.textPosition)) {
    properties.push(
      `<w:position w:val="${convertFontSizeToHalfPoint(style.textPosition)}"/>`
    )
  }
  if (style.textOutline?.hollow) properties.push('<w:outline/>')
  if (style.textShadow) properties.push('<w:shadow/>')
  if (style.textCombine) {
    properties.push('<w:eastAsianLayout w:combine="1"/>')
  }
  const xml = properties.filter(Boolean).join('')
  return xml ? `<w:rPr>${xml}</w:rPr>` : ''
}

/** 解析文档样式的 OOXML 类型。 */
function getOoxmlDocumentStyleType(style: IDocumentStyle) {
  switch (style.type) {
    case 'character':
      return 'character'
    case 'table':
      return 'table'
    case 'list':
      return 'numbering'
    default:
      return 'paragraph'
  }
}

/** 生成显式文档样式定义。 */
function createOoxmlDocumentStyle(style: IDocumentStyle) {
  const styleId = normalizeOoxmlStyleId(style.id)
  const name = escapeOoxmlStyleText(style.name || style.id)
  const type = getOoxmlDocumentStyleType(style)
  const basedOn = style.basedOn
    ? `<w:basedOn w:val="${normalizeOoxmlStyleId(style.basedOn)}"/>`
    : ''
  const next = style.next
    ? `<w:next w:val="${normalizeOoxmlStyleId(style.next)}"/>`
    : ''
  const paragraphProperties =
    type === 'paragraph' ? createOoxmlStyleParagraphProperties(style.paragraph) : ''
  const runProperties = createOoxmlStyleRunProperties(style.text)
  const qFormat = style.builtin || type === 'paragraph' ? '<w:qFormat/>' : ''
  return `<w:style w:type="${type}" w:styleId="${styleId}"><w:name w:val="${name}"/>${basedOn}${next}${qFormat}${paragraphProperties}${runProperties}</w:style>`
}

/** 解析 DOCX 默认字体，未传入时使用编辑器默认中文字体。 */
function getOoxmlDefaultFont(options?: IEditorOption) {
  return options?.defaultFont || 'Microsoft YaHei'
}

/** 生成默认字体属性，同时覆盖 ascii/hAnsi/eastAsia/cs，避免 Office 字体替换。 */
function createOoxmlDefaultFontProperties(options?: IEditorOption) {
  const font = escapeOoxmlStyleText(getOoxmlDefaultFont(options))
  return `<w:rFonts w:hint="eastAsia" w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`
}

/** 生成默认 run 属性，承载全局字体和字号，供无显式字体的普通文本继承。 */
function createOoxmlDefaultRunProperties(options?: IEditorOption) {
  const size = convertFontSizeToHalfPoint(options?.defaultSize || 16)
  return `${createOoxmlDefaultFontProperties(options)}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:lang w:val="zh-CN" w:eastAsia="zh-CN" w:bidi="zh-CN"/>`
}

/** 生成 styles.xml，提供 Normal、Heading1-6 和显式传入的文档样式。 */
export function createOoxmlStylesXml(
  _elementList: IElement[] = [],
  options?: IEditorOption,
  styles: IDocumentStyle[] = []
) {
  const headingStyles = Object.values(TitleLevel)
    .map(level => createOoxmlHeadingStyle(level, options))
    .join('')
  const documentStyles = styles
    .filter(style => style.id)
    .map(createOoxmlDocumentStyle)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${STYLE_NAMESPACES}><w:docDefaults><w:rPrDefault><w:rPr>${createOoxmlDefaultRunProperties(options)}</w:rPr></w:rPrDefault></w:docDefaults>${createOoxmlNormalStyle(options)}${headingStyles}${documentStyles}</w:styles>`
}
