import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import {
  convertFontSizeToHalfPoint,
  convertPxToTwip,
  normalizeOoxmlHexColor
} from './OoxmlUnit'
import {
  createOoxmlImageRun,
  hasOoxmlImageResource
} from './OoxmlMedia'
import { createOoxmlHyperlinkRelationshipId } from './OoxmlHyperlink'
import {
  getOoxmlControlDisplayText,
  isOoxmlControlAffixElement
} from './OoxmlControlExport'
import { createOoxmlFormulaRun } from './OoxmlFormulaExport'
import {
  createOoxmlStableNumber,
  escapeOoxmlText
} from './OoxmlCommon'
import { isOoxmlSeparatorElement } from './OoxmlSeparatorExport'

/** 判断文本是否需要保留首尾空格或连续空格。 */
function shouldPreserveTextSpace(value: string) {
  return /^\s|\s$|\s{2,}/.test(value)
}

/** 生成 OOXML 文本节点，按文本内容决定是否保留空格。 */
function createOoxmlTextNode(value: string) {
  const text = escapeOoxmlText(value)
  const space = shouldPreserveTextSpace(value) ? ' xml:space="preserve"' : ''
  return `<w:t${space}>${text}</w:t>`
}

/** 生成 run 属性，第一批覆盖字体、字号和常见字符样式。 */
function createOoxmlRunProperties(element: IElement) {
  const properties: string[] = []
  // 字体需要同时写 ascii/hAnsi/eastAsia，避免中文字体在 WPS/ONLYOFFICE 中丢失。
  if (element.font) {
    const font = escapeOoxmlText(element.font)
    properties.push(
      `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}"/>`
    )
  }
  if (element.size) {
    properties.push(`<w:sz w:val="${convertFontSizeToHalfPoint(element.size)}"/>`)
  }
  if (typeof element.textScale === 'number' && Number.isFinite(element.textScale)) {
    properties.push(`<w:w w:val="${Math.max(1, Math.round(element.textScale))}"/>`)
  }
  if (
    typeof element.letterSpacing === 'number' &&
    Number.isFinite(element.letterSpacing)
  ) {
    // Word 字符间距使用 twip，直接复用 px->twip 换算保持导出度量一致。
    properties.push(`<w:spacing w:val="${convertPxToTwip(element.letterSpacing)}"/>`)
  }
  if (
    typeof element.textPosition === 'number' &&
    Number.isFinite(element.textPosition)
  ) {
    properties.push(`<w:position w:val="${convertFontSizeToHalfPoint(element.textPosition)}"/>`)
  }
  if (element.bold) {
    properties.push('<w:b/>')
  }
  if (element.italic) {
    properties.push('<w:i/>')
  }
  if (element.underline) {
    properties.push('<w:u w:val="single"/>')
  }
  if (element.strikeout) {
    properties.push('<w:strike/>')
  }
  if (element.color) {
    properties.push(`<w:color w:val="${normalizeOoxmlHexColor(element.color)}"/>`)
  }
  if (element.highlight) {
    properties.push(
      `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeOoxmlHexColor(element.highlight)}"/>`
    )
  }
  if (element.textOutline?.hollow) {
    properties.push('<w:outline/>')
  }
  if (element.textShadow) {
    properties.push('<w:shadow/>')
  }
  if (element.textCombine) {
    properties.push('<w:eastAsianLayout w:combine="1"/>')
  }
  // 上下标元素保留为 Word 原生基线对齐，便于后续导入恢复。
  if (element.type === ElementType.SUPERSCRIPT) {
    properties.push('<w:vertAlign w:val="superscript"/>')
  } else if (element.type === ElementType.SUBSCRIPT) {
    properties.push('<w:vertAlign w:val="subscript"/>')
  }
  return properties.length ? `<w:rPr>${properties.join('')}</w:rPr>` : ''
}

/** 生成普通文本 run，必要时保留空格。 */
export function createOoxmlTextRun(element: IElement) {
  const textXml = (element.value || '')
    .split('\n')
    .map((valuePart, partIndex) => {
      const breakXml = partIndex > 0 ? '<w:br/>' : ''
      return `${breakXml}${createOoxmlTextNode(valuePart)}`
    })
    .join('')
  return `<w:r>${createOoxmlRunProperties(element)}${textXml}</w:r>`
}

/** 生成制表符 run，保持内部 TAB 元素到 OOXML 的结构映射。 */
function createOoxmlTabRun(element: IElement) {
  return `<w:r>${createOoxmlRunProperties(element)}<w:tab/></w:r>`
}

/** 生成分页符 run，第一批按 Word 原生 page break 输出。 */
function createOoxmlPageBreakRun(element: IElement) {
  return `<w:r>${createOoxmlRunProperties(element)}<w:br w:type="page"/></w:r>`
}

/** 生成修订记录属性，保留内部 trackChange 的作者、时间和批次 id。 */
function createOoxmlTrackChangeAttributes(element: IElement) {
  const trackChange = element.trackChange
  if (!trackChange) return ''
  const id = createOoxmlStableNumber(trackChange.id || `${trackChange.type}-${trackChange.timestamp}`)
  const author = escapeOoxmlText(trackChange.author || 'canvas-editor')
  const date = Number.isFinite(trackChange.timestamp)
    ? new Date(trackChange.timestamp).toISOString()
    : new Date(0).toISOString()
  return `w:id="${id}" w:author="${author}" w:date="${date}"`
}

/** 根据元素修订类型包裹 run 内容，第一批先做 run 级插入/删除结构。 */
function wrapOoxmlTrackChangeRun(element: IElement, runXml: string) {
  if (!element.trackChange) return runXml
  const attributes = createOoxmlTrackChangeAttributes(element)
  if (element.trackChange.type === 'delete') {
    return `<w:del ${attributes}>${runXml}</w:del>`
  }
  return `<w:ins ${attributes}>${runXml}</w:ins>`
}

/** 生成超链接 run，正文显示仍复用普通文本 run，链接目标由 relationship 承载。 */
function createOoxmlHyperlinkRun(element: IElement) {
  if (!element.url) return createOoxmlTextRun(element)
  return `<w:hyperlink r:id="${createOoxmlHyperlinkRelationshipId(element)}">${createOoxmlTextRun(element)}</w:hyperlink>`
}

/** 生成业务控件普通文本 run，DOCX 导出只保留最终展示值，不携带网页业务控件结构。 */
function createOoxmlControlRun(element: IElement) {
  return createOoxmlTextRun({
    ...element,
    type: ElementType.TEXT,
    value: getOoxmlControlDisplayText(element)
  })
}

/** 解析日期控件展示文本，DATE 元素通常把真实显示值放在 valueList 中。 */
function getOoxmlDateDisplayText(element: IElement) {
  return element.valueList?.map(valueElement => valueElement.value || '').join('') || element.value || ''
}

/** 生成日期普通文本 run，日期控件只属于网页交互层，DOCX 中保留显示日期。 */
function createOoxmlDateRun(element: IElement) {
  const displayText = getOoxmlDateDisplayText(element)
  return createOoxmlTextRun({
    ...element,
    type: ElementType.TEXT,
    value: displayText
  })
}

/** 生成复选框和单选框普通文本 run，用可读符号承载最终勾选状态。 */
function createOoxmlCheckableRun(element: IElement) {
  const isCheckbox = element.type === ElementType.CHECKBOX
  const checked = isCheckbox ? !!element.checkbox?.value : !!element.radio?.value
  const symbol = isCheckbox ? (checked ? '☑' : '☐') : (checked ? '◉' : '○')
  return createOoxmlTextRun({
    ...element,
    type: ElementType.TEXT,
    value: symbol
  })
}

/** 按元素类型生成段落内 OOXML run 内容，不在这里处理修订包裹。 */
function createOoxmlRunContent(element: IElement) {
  // 所有网页业务控件导出为普通文本时都要去掉前后缀边界，避免 Word 中出现 `{}`。
  if (isOoxmlControlAffixElement(element)) {
    return ''
  }
  // 分隔线由段落边框承载，避免导出成空文本或不可见的换行 run。
  if (isOoxmlSeparatorElement(element)) {
    return ''
  }
  if (element.type === ElementType.TAB) {
    return createOoxmlTabRun(element)
  }
  if (element.type === ElementType.PAGE_BREAK) {
    return createOoxmlPageBreakRun(element)
  }
  if (element.type === ElementType.IMAGE) {
    return hasOoxmlImageResource(element) ? createOoxmlImageRun(element) : ''
  }
  if (element.type === ElementType.HYPERLINK) {
    return createOoxmlHyperlinkRun(element)
  }
  if (element.type === ElementType.DATE) {
    return createOoxmlDateRun(element)
  }
  if (
    element.type === ElementType.CHECKBOX ||
    element.type === ElementType.RADIO
  ) {
    return createOoxmlCheckableRun(element)
  }
  if (element.type === ElementType.CONTROL) {
    return createOoxmlControlRun(element)
  }
  if (element.type === ElementType.LATEX) {
    return createOoxmlFormulaRun(element, createOoxmlTextRun)
  }
  return createOoxmlTextRun(element)
}

/** 按元素类型生成段落内 OOXML run，并统一处理修订留痕。 */
export function createOoxmlRun(element: IElement) {
  return wrapOoxmlTrackChangeRun(element, createOoxmlRunContent(element))
}
