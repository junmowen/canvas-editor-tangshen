import { RowFlex } from '../../../dataset/enum/Row'
import { TitleLevel } from '../../../dataset/enum/Title'
import { IElement } from '../../../interface/Element'
import {
  getOoxmlAttribute,
  getOoxmlChildElement as getFirstChildElement,
  getOoxmlChildElements as getChildElements
} from './OoxmlDom'

/** OOXML twip 到内部 px 的换算比例，必须和导出侧 px->twip 保持互逆。 */
const TWIP_TO_PX = 1 / 15

/** OOXML 段落属性解析结果，用于回填到当前段落可见元素。 */
export interface IOoxmlParagraphImportStyle {
  /** 段落样式 id，来源于 w:pStyle，非内置 Heading 时保留为自定义样式。 */
  styleId?: string
  /** 标题层级，来源于内置 Heading1-6 段落样式。 */
  level?: TitleLevel
  /** 列表 id，来源于 w:numPr/w:numId。 */
  listId?: string
  /** 列表层级，来源于 w:numPr/w:ilvl。 */
  listLevel?: number
  /** 段落水平对齐方式，来源于 w:jc。 */
  rowFlex?: RowFlex
  /** 左缩进，来源于 w:ind/@w:left。 */
  rowIndentLeft?: number
  /** 右缩进，来源于 w:ind/@w:right。 */
  rowIndentRight?: number
  /** 首行缩进，来源于 w:ind/@w:firstLine。 */
  rowIndent?: number
  /** 悬挂缩进，来源于 w:ind/@w:hanging。 */
  rowHangingIndent?: number
  /** 段前间距，来源于 w:spacing/@w:before。 */
  spaceBefore?: number
  /** 段后间距，来源于 w:spacing/@w:after。 */
  spaceAfter?: number
  /** 行距，来源于 w:spacing/@w:line。 */
  lineSpacing?: number
  /** 行距类型，来源于 w:spacing/@w:lineRule。 */
  lineSpacingType?: 'auto' | 'exact' | 'multiple'
  /** 段前分页，来源于 w:pageBreakBefore。 */
  pageBreakBefore?: boolean
  /** 与下段同页，来源于 w:keepNext。 */
  keepWithNext?: boolean
  /** 段内同页，来源于 w:keepLines。 */
  keepLines?: boolean
  /** 孤行控制，来源于 w:widowControl。 */
  widowControl?: boolean
  /** 段落制表位，来源于 w:tabs/w:tab。 */
  tabStops?: IElement['tabStops']
}

/** Word 内置 Heading 样式到内部标题层级的映射。 */
const OOXML_HEADING_STYLE_LEVEL_MAP: Record<string, TitleLevel> = {
  Heading1: TitleLevel.FIRST,
  Heading2: TitleLevel.SECOND,
  Heading3: TitleLevel.THIRD,
  Heading4: TitleLevel.FOURTH,
  Heading5: TitleLevel.FIFTH,
  Heading6: TitleLevel.SIXTH
}

/** 把 OOXML twip 数值转换为编辑器内部像素。 */
function importOoxmlTwipToPx(value: string | null | undefined) {
  const twipValue = Number(value || 0)
  return Number.isFinite(twipValue) ? Math.round(twipValue * TWIP_TO_PX) : 0
}

/** 把 OOXML jc 对齐值还原为内部段落对齐。 */
function importOoxmlParagraphRowFlex(value: string | null | undefined) {
  if (value === 'center') return RowFlex.CENTER
  if (value === 'right') return RowFlex.RIGHT
  if (value === 'both' || value === 'distribute') return RowFlex.JUSTIFY
  return undefined
}

/** 把 OOXML tab 对齐值还原为内部制表位对齐。 */
function importOoxmlTabAlignment(
  value: string | null | undefined
): NonNullable<IElement['tabStops']>[number]['alignment'] {
  if (
    value === 'right' ||
    value === 'center' ||
    value === 'decimal' ||
    value === 'bar'
  ) {
    return value
  }
  return 'left'
}

/** 解析段落缩进，恢复左/右缩进、首行缩进和悬挂缩进。 */
function parseOoxmlParagraphIndent(paragraphProperties: Element | undefined) {
  const indent = getFirstChildElement(paragraphProperties, 'ind')
  if (!indent) return {}
  const left = importOoxmlTwipToPx(getOoxmlAttribute(indent, 'left'))
  const right = importOoxmlTwipToPx(getOoxmlAttribute(indent, 'right'))
  const firstLine = importOoxmlTwipToPx(getOoxmlAttribute(indent, 'firstLine'))
  const hanging = importOoxmlTwipToPx(getOoxmlAttribute(indent, 'hanging'))
  return {
    ...(left ? { rowIndentLeft: left } : {}),
    ...(right ? { rowIndentRight: right } : {}),
    ...(firstLine ? { rowIndent: firstLine } : {}),
    ...(hanging ? { rowHangingIndent: hanging } : {})
  }
}

/** 解析段落间距和行距，和导出侧 w:spacing 保持互逆。 */
function parseOoxmlParagraphSpacing(paragraphProperties: Element | undefined) {
  const spacing = getFirstChildElement(paragraphProperties, 'spacing')
  if (!spacing) return {}
  const before = importOoxmlTwipToPx(getOoxmlAttribute(spacing, 'before'))
  const after = importOoxmlTwipToPx(getOoxmlAttribute(spacing, 'after'))
  const lineRule = getOoxmlAttribute(spacing, 'lineRule')
  const lineValue = Number(getOoxmlAttribute(spacing, 'line') || 0)
  const lineSpacingType: IOoxmlParagraphImportStyle['lineSpacingType'] =
    lineValue > 0
      ? lineRule === 'auto'
        ? 'multiple'
        : 'exact'
      : undefined
  const lineSpacing =
    lineSpacingType === 'multiple'
      ? Math.round((lineValue / 240) * 100) / 100
      : importOoxmlTwipToPx(getOoxmlAttribute(spacing, 'line'))
  return {
    ...(before ? { spaceBefore: before } : {}),
    ...(after ? { spaceAfter: after } : {}),
    ...(lineSpacingType && lineSpacing
      ? { lineSpacingType, lineSpacing }
      : {})
  }
}

/** 解析段落制表位，恢复位置和对齐方式。 */
function parseOoxmlParagraphTabStops(paragraphProperties: Element | undefined) {
  const tabs = getFirstChildElement(paragraphProperties, 'tabs')
  const tabStops = getChildElements(tabs as Element, 'tab')
    .map(tab => ({
      position: importOoxmlTwipToPx(getOoxmlAttribute(tab, 'pos')),
      alignment: importOoxmlTabAlignment(getOoxmlAttribute(tab, 'val'))
    }))
    .filter(tabStop => tabStop.position > 0)
  return tabStops.length ? { tabStops } : {}
}

/** 解析段落分页控制开关，恢复 keep/pageBreak/widow 语义。 */
function parseOoxmlParagraphPagination(paragraphProperties: Element | undefined) {
  return {
    ...(getFirstChildElement(paragraphProperties, 'pageBreakBefore')
      ? { pageBreakBefore: true }
      : {}),
    ...(getFirstChildElement(paragraphProperties, 'keepNext')
      ? { keepWithNext: true }
      : {}),
    ...(getFirstChildElement(paragraphProperties, 'keepLines')
      ? { keepLines: true }
      : {}),
    ...(getFirstChildElement(paragraphProperties, 'widowControl')
      ? { widowControl: true }
      : {})
  }
}

/** 解析段落样式，内置 Heading 还原为标题层级，自定义样式保留 styleId。 */
function parseOoxmlParagraphStyleId(paragraphProperties: Element | undefined) {
  const paragraphStyle = getFirstChildElement(paragraphProperties, 'pStyle')
  const styleId = getOoxmlAttribute(paragraphStyle, 'val') || undefined
  if (!styleId || styleId === 'Normal') return {}
  const level = OOXML_HEADING_STYLE_LEVEL_MAP[styleId]
  return level ? { level } : { styleId }
}

/** 解析段落编号属性，保留列表层级和 OOXML numId 派生出的稳定列表 id。 */
function parseOoxmlParagraphNumbering(paragraphProperties: Element | undefined) {
  const numbering = getFirstChildElement(paragraphProperties, 'numPr')
  if (!numbering) return {}
  const numId = getOoxmlAttribute(
    getFirstChildElement(numbering, 'numId'),
    'val'
  )
  if (!numId) return {}
  const level = Number(
    getOoxmlAttribute(getFirstChildElement(numbering, 'ilvl'), 'val') || 0
  )
  return {
    listId: `ooxml-num-${numId}`,
    listLevel: Number.isFinite(level) ? level : 0
  }
}

/** 解析 w:pPr 段落属性，覆盖导出侧第一批段落高级属性。 */
export function parseOoxmlParagraphImportStyle(
  paragraphElement: Element
): IOoxmlParagraphImportStyle {
  const paragraphProperties = getFirstChildElement(paragraphElement, 'pPr')
  if (!paragraphProperties) return {}
  const justification = getFirstChildElement(paragraphProperties, 'jc')
  const rowFlex = importOoxmlParagraphRowFlex(
    getOoxmlAttribute(justification, 'val')
  )
  return {
    ...parseOoxmlParagraphStyleId(paragraphProperties),
    ...parseOoxmlParagraphNumbering(paragraphProperties),
    ...(rowFlex ? { rowFlex } : {}),
    ...parseOoxmlParagraphIndent(paragraphProperties),
    ...parseOoxmlParagraphSpacing(paragraphProperties),
    ...parseOoxmlParagraphTabStops(paragraphProperties),
    ...parseOoxmlParagraphPagination(paragraphProperties)
  }
}

/** 把段落属性挂到段落元素上，保证导入后再次导出仍能保留段落格式。 */
export function applyOoxmlParagraphImportStyle(
  elementList: IElement[],
  style: IOoxmlParagraphImportStyle
) {
  if (!Object.keys(style).length) return elementList
  return elementList.map(element => ({
    ...element,
    ...style
  }))
}
