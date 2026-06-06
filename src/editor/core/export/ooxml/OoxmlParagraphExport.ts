import { RowFlex } from '../../../dataset/enum/Row'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { ITd } from '../../../interface/table/Td'
import { convertPxToTwip } from './OoxmlUnit'
import { createOoxmlNumberingProperties } from './OoxmlNumbering'
import { resolveOoxmlParagraphStyleId } from './OoxmlStyles'
import {
  createOoxmlSeparatorParagraphBorder,
  isOoxmlSeparatorElement,
  TOoxmlSeparatorExportOptions
} from './OoxmlSeparatorExport'
import { normalizeOoxmlInlineControlFragments } from './OoxmlControlExport'
import { createOoxmlRun } from './OoxmlRunExport'
import { createOoxmlTableXml } from './OoxmlTableExport'
import {
  hasOoxmlZeroParagraphBoundary,
  resolveOoxmlBodyContentElementKind,
  shouldCreateImplicitOoxmlParagraphBoundary,
  shouldKeepEmptyOoxmlInlineElement,
  shouldSkipOoxmlEmptyParagraphFlush,
  splitOoxmlParagraphValueByZero
} from './OoxmlParagraphBoundaryAdapter'
import {
  isOoxmlParagraphMetricValue,
  resolveOoxmlParagraphBookmark,
  resolveOoxmlParagraphStyleElement
} from './OoxmlParagraphStyleAdapter'

/** 正文导出上下文，承载段落分隔线和表格默认配置。 */
type TOoxmlBodyContentExportOptions = TOoxmlSeparatorExportOptions &
  Pick<IEditorOption, 'table'>

/** 段落模型，保存按 ZERO 段落符切开的正文元素。 */
export interface IOoxmlParagraphModel {
  /** 段落内需要导出的元素列表。 */
  elementList: IElement[]
  /** 段落属性来源元素，优先使用段落结束符或首个正文元素。 */
  styleElement?: IElement
}

/** 把段落对齐方式映射为 OOXML jc 值。 */
function getOoxmlJustification(rowFlex?: RowFlex) {
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

/** 生成段落缩进属性，按内部首行/悬挂语义换算为 OOXML ind。 */
function createOoxmlParagraphIndent(element?: IElement) {
  if (!element) return ''
  const left = Math.max(0, element.rowIndentLeft || 0)
  const right = Math.max(0, element.rowIndentRight || 0)
  const firstLine = Math.max(0, element.rowIndent || 0)
  const hanging = Math.max(0, element.rowHangingIndent || 0)
  const firstLineOffset = left + firstLine
  const followingLineOffset = left + hanging
  const properties: string[] = []

  if (
    !left &&
    !right &&
    !firstLine &&
    !hanging
  ) {
    return ''
  }

  properties.push(`w:left="${convertPxToTwip(followingLineOffset)}"`)
  if (right) {
    properties.push(`w:right="${convertPxToTwip(right)}"`)
  }
  // OOXML firstLine 与 hanging 互斥，这里按首行和后续行的真实偏移差值选择写入。
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

/** 生成段落间距和行距属性，覆盖段前、段后、精确行距和倍数行距。 */
function createOoxmlParagraphSpacing(element?: IElement) {
  if (!element) return ''
  const properties: string[] = []
  if (isOoxmlParagraphMetricValue(element.spaceBefore)) {
    properties.push(`w:before="${convertPxToTwip(element.spaceBefore)}"`)
  }
  if (isOoxmlParagraphMetricValue(element.spaceAfter)) {
    properties.push(`w:after="${convertPxToTwip(element.spaceAfter)}"`)
  }
  if (isOoxmlParagraphMetricValue(element.lineSpacing) && element.lineSpacing! > 0) {
    if (element.lineSpacingType === 'multiple') {
      properties.push(`w:line="${Math.max(1, Math.round(element.lineSpacing! * 240))}"`)
      properties.push('w:lineRule="auto"')
    } else {
      properties.push(`w:line="${convertPxToTwip(element.lineSpacing)}"`)
      properties.push(
        `w:lineRule="${element.lineSpacingType === 'auto' ? 'auto' : 'exact'}"`
      )
    }
  }
  return properties.length ? `<w:spacing ${properties.join(' ')}/>` : ''
}

/** 把内部制表位对齐方式映射为 OOXML tab val。 */
function getOoxmlTabAlignment(alignment?: string) {
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

/** 生成段落制表位属性，按位置排序后写入 Word 原生 tab 定义。 */
function createOoxmlParagraphTabs(element?: IElement) {
  const tabStops = (element?.tabStops || [])
    .filter(tabStop => isOoxmlParagraphMetricValue(tabStop.position))
    .sort((left, right) => left.position - right.position)
  if (!tabStops.length) return ''
  const tabXml = tabStops
    .map(
      tabStop =>
        `<w:tab w:val="${getOoxmlTabAlignment(tabStop.alignment)}" w:pos="${convertPxToTwip(tabStop.position)}"/>`
    )
    .join('')
  return `<w:tabs>${tabXml}</w:tabs>`
}

/** 生成段落分页控制属性，导出 Word 原生 keep/pageBreak/widow 开关。 */
function createOoxmlParagraphPagination(element?: IElement) {
  if (!element) return []
  const properties: string[] = []
  if (element.pageBreakBefore) {
    properties.push('<w:pageBreakBefore/>')
  }
  if (element.keepWithNext) {
    properties.push('<w:keepNext/>')
  }
  if (element.keepLines) {
    properties.push('<w:keepLines/>')
  }
  if (element.widowControl) {
    properties.push('<w:widowControl/>')
  }
  return properties
}

/** 生成段落属性，覆盖编号、样式、对齐、缩进、间距、分页控制和制表位。 */
function createOoxmlParagraphProperties(
  element?: IElement,
  separatorElement?: IElement,
  options?: TOoxmlSeparatorExportOptions
) {
  const justify = getOoxmlJustification(element?.rowFlex)
  const styleId = resolveOoxmlParagraphStyleId(element)
  const properties: string[] = []
  const numbering = createOoxmlNumberingProperties(element)
  if (numbering) {
    properties.push(numbering)
  }
  if (styleId) {
    properties.push(`<w:pStyle w:val="${styleId}"/>`)
  }
  if (justify) {
    properties.push(`<w:jc w:val="${justify}"/>`)
  }
  const tabs = createOoxmlParagraphTabs(element)
  if (tabs) {
    properties.push(tabs)
  }
  const spacing = createOoxmlParagraphSpacing(element)
  if (spacing) {
    properties.push(spacing)
  }
  const indent = createOoxmlParagraphIndent(element)
  if (indent) {
    properties.push(indent)
  }
  properties.push(...createOoxmlParagraphPagination(element))
  const separatorBorder = createOoxmlSeparatorParagraphBorder(
    separatorElement,
    options
  )
  if (separatorBorder) {
    properties.push(separatorBorder)
  }
  return properties.length ? `<w:pPr>${properties.join('')}</w:pPr>` : ''
}

/** 判断元素是否携带第一批可导出的段落属性。 */
function hasOoxmlParagraphProperties(element?: IElement) {
  return !!(
    getOoxmlJustification(element?.rowFlex) ||
    createOoxmlNumberingProperties(element) ||
    resolveOoxmlParagraphStyleId(element) ||
    createOoxmlParagraphTabs(element) ||
    createOoxmlParagraphSpacing(element) ||
    createOoxmlParagraphIndent(element) ||
    createOoxmlParagraphPagination(element).length
  )
}

/** 生成单元格正文，空单元格也保留一个空段落以满足 WordprocessingML 结构。 */
function createOoxmlTableCellBody(
  td: ITd,
  options?: TOoxmlBodyContentExportOptions
) {
  const paragraphXml = createOoxmlParagraphModels(td.value || [])
    .map(paragraph => createOoxmlParagraph(paragraph, options))
    .join('')
  return paragraphXml || '<w:p/>'
}

/** 生成表格 XML，保留 OoxmlPackage 的原导出入口，实际结构生成交给表格模块维护。 */
export function createOoxmlTable(
  element: IElement,
  options?: TOoxmlBodyContentExportOptions
) {
  return createOoxmlTableXml(
    element,
    td => createOoxmlTableCellBody(td, options),
    options
  )
}

/** 把内部元素按 ZERO 段落符切成 OOXML 段落模型。 */
export function createOoxmlParagraphModels(elementList: IElement[]) {
  const paragraphList: IOoxmlParagraphModel[] = []
  let currentElementList: IElement[] = []

  /** 输出当前累计段落，供显式 ZERO 和隐式列表/标题边界共同复用。 */
  const flushCurrentParagraph = (paragraphEndElement?: IElement) => {
    if (shouldSkipOoxmlEmptyParagraphFlush(currentElementList, paragraphList)) {
      return
    }
    paragraphList.push({
      elementList: currentElementList,
      styleElement: resolveOoxmlParagraphStyleElement(
        currentElementList,
        paragraphEndElement,
        hasOoxmlParagraphProperties
      )
    })
    currentElementList = []
  }

  for (const element of elementList) {
    if (shouldCreateImplicitOoxmlParagraphBoundary(currentElementList, element)) {
      flushCurrentParagraph()
    }

    const value = element.value || ''
    if (!value && shouldKeepEmptyOoxmlInlineElement(element)) {
      currentElementList.push(element)
      continue
    }
    // 空的普通文本元素通常只是编辑器内部占位，导出为 Word 会变成页眉或正文的多余空段。
    if (!value) {
      continue
    }
    const valuePartList = splitOoxmlParagraphValueByZero(value)
    for (let partIndex = 0; partIndex < valuePartList.length; partIndex++) {
      const valuePart = valuePartList[partIndex]
      if (valuePart) {
        currentElementList.push({ ...element, value: valuePart })
      }
      // ZERO 表示段落结束符，结束符自身承载当前段落的段落属性。
      if (hasOoxmlZeroParagraphBoundary(valuePartList, partIndex)) {
        flushCurrentParagraph(element)
      }
    }
  }

  // 文档末尾没有 ZERO 时仍需要生成最后一个有内容的段落，空输入不额外制造空段。
  if (currentElementList.length) {
    paragraphList.push({
      elementList: currentElementList,
      styleElement: currentElementList[0]
    })
  }
  return paragraphList
}

/** 生成单个段落的 WordprocessingML。 */
export function createOoxmlParagraph(
  paragraph: IOoxmlParagraphModel,
  options?: TOoxmlBodyContentExportOptions
) {
  const styleElement = paragraph.styleElement || paragraph.elementList[0]
  const separatorElement = paragraph.elementList.find(isOoxmlSeparatorElement)
  const paragraphProperties = createOoxmlParagraphProperties(
    styleElement,
    separatorElement,
    options
  )
  const bookmark = resolveOoxmlParagraphBookmark(styleElement)
  const bookmarkStart = bookmark
    ? `<w:bookmarkStart w:id="${bookmark.id}" w:name="${bookmark.name}"/>`
    : ''
  const bookmarkEnd = bookmark
    ? `<w:bookmarkEnd w:id="${bookmark.id}"/>`
    : ''
  const runs = normalizeOoxmlInlineControlFragments(paragraph.elementList)
    .map(createOoxmlRun)
    .join('')
  return `<w:p>${paragraphProperties}${bookmarkStart}${runs}${bookmarkEnd}</w:p>`
}

/** 生成正文 body 内部 XML，表格作为块级对象从段落流中独立输出。 */
export function createOoxmlBodyContentXml(
  elementList: IElement[],
  options?: TOoxmlBodyContentExportOptions
) {
  const xmlList: string[] = []
  let pendingInlineElementList: IElement[] = []

  const flushPendingParagraphs = () => {
    if (!pendingInlineElementList.length) return
    xmlList.push(
      ...createOoxmlParagraphModels(pendingInlineElementList).map(
        paragraph => createOoxmlParagraph(paragraph, options)
      )
    )
    pendingInlineElementList = []
  }

  for (const element of elementList) {
    if (resolveOoxmlBodyContentElementKind(element) === 'table') {
      flushPendingParagraphs()
      xmlList.push(createOoxmlTable(element, options))
    } else {
      pendingInlineElementList.push(element)
    }
  }
  flushPendingParagraphs()
  return xmlList.join('')
}
