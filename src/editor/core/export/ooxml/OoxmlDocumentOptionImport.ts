import { NumberType } from '../../../dataset/enum/Common'
import { PaperDirection } from '../../../dataset/enum/Editor'
import { LineNumberType } from '../../../dataset/enum/LineNumber'
import { defaultTableOption } from '../../../dataset/constant/Table'
import { IEditorOption } from '../../../interface/Editor'
import {
  getFirstOoxmlElement,
  getOoxmlAttribute,
  getOoxmlChildElement,
  hasOoxmlParserError,
  isOoxmlElement
} from './OoxmlDom'

/** OOXML twip 到编辑器像素的换算比例，必须与导出侧保持一致。 */
const TWIP_TO_PX = 1 / 15

/** OOXML page border 线宽单位为 eighth-point，导入时还原为内部线宽。 */
const OOXML_BORDER_SIZE_RATIO = 1 / 8

/** 页面边框节点名称，按内部 padding 的上、右、下、左顺序读取。 */
const PAGE_BORDER_SIDE_NAMES = ['top', 'right', 'bottom', 'left'] as const

/** 把 OOXML twip 数值转换为编辑器内部像素。 */
function convertTwipToPx(value: string | null | undefined) {
  const twipValue = Number(value || 0)
  return Number.isFinite(twipValue) ? Math.round(twipValue * TWIP_TO_PX) : 0
}

/** 把 OOXML eighth-point 线宽转换为编辑器边框线宽。 */
function convertOoxmlBorderSizeToLineWidth(value: string | null | undefined) {
  const borderSize = Number(value || 0)
  return Number.isFinite(borderSize)
    ? Math.max(1, Math.round(borderSize * OOXML_BORDER_SIZE_RATIO))
    : 1
}

/** 创建或复用 XML 文档对象，供导入侧按结构读取节点而不是用字符串拼接解析。 */
function createOoxmlXmlDocument(xml: string | Document) {
  if (typeof xml !== 'string') {
    return xml
  }
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is required to import OOXML document options')
  }
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (hasOoxmlParserError(document)) {
    throw new Error('Invalid OOXML XML document')
  }
  return document
}

/** 把 OOXML 页边框样式映射回内部页面边框样式。 */
function getImportedPageBorderStyle(
  value: string | null
): NonNullable<IEditorOption['pageBorder']>['style'] {
  switch (value) {
    case 'dashed':
      return 'dashed'
    case 'dotted':
      return 'dotted'
    case 'double':
      return 'double'
    default:
      return 'solid'
  }
}

/** 导入页面大小和横纵向配置。 */
function importOoxmlPageSizeOptions(document: Document) {
  const pageSize = getFirstOoxmlElement(document, 'pgSz')
  if (!pageSize) return {}
  const orient = getOoxmlAttribute(pageSize, 'orient')
  return {
    width: convertTwipToPx(getOoxmlAttribute(pageSize, 'w')),
    height: convertTwipToPx(getOoxmlAttribute(pageSize, 'h')),
    paperDirection:
      orient === 'landscape'
        ? PaperDirection.HORIZONTAL
        : PaperDirection.VERTICAL
  }
}

/** 导入页边距和装订线配置。 */
function importOoxmlPageMarginOptions(document: Document) {
  const pageMargin = getFirstOoxmlElement(document, 'pgMar')
  if (!pageMargin) return {}
  const header = getOoxmlAttribute(pageMargin, 'header')
  const footer = getOoxmlAttribute(pageMargin, 'footer')
  return {
    margins: [
      convertTwipToPx(getOoxmlAttribute(pageMargin, 'top')),
      convertTwipToPx(getOoxmlAttribute(pageMargin, 'right')),
      convertTwipToPx(getOoxmlAttribute(pageMargin, 'bottom')),
      convertTwipToPx(getOoxmlAttribute(pageMargin, 'left'))
    ] as IEditorOption['margins'],
    gutter: convertTwipToPx(getOoxmlAttribute(pageMargin, 'gutter')),
    ...(header !== null ? { header: { top: convertTwipToPx(header) } } : {}),
    ...(footer !== null ? { footer: { bottom: convertTwipToPx(footer) } } : {})
  }
}

/** 导入全局分栏配置，支持等宽分栏和自定义栏宽。 */
function importOoxmlPageColumnOptions(document: Document) {
  const columns = getFirstOoxmlElement(document, 'cols')
  if (!columns) return {}
  const count = Math.max(1, Number(getOoxmlAttribute(columns, 'num') || 1))
  const columnElementList: Element[] = []
  for (let index = 0; index < columns.children.length; index++) {
    const element = columns.children[index]
    if (isOoxmlElement(element, 'col')) {
      columnElementList.push(element)
    }
  }
  const firstColumnGap = getOoxmlAttribute(columnElementList[0], 'space')
  // 等宽分栏通常把间距写在 w:cols，自定义栏宽会写在每个 w:col 上。
  const gap = convertTwipToPx(
    getOoxmlAttribute(columns, 'space') || firstColumnGap
  )
  const widthList = columnElementList
    .map(element => convertTwipToPx(getOoxmlAttribute(element, 'w')))
    .filter(width => width > 0)

  return {
    columns: {
      count,
      gap,
      ...(widthList.length ? { widths: widthList } : {})
    }
  }
}

/** 导入页码起始值和数字格式。 */
function importOoxmlPageNumberOptions(document: Document) {
  const pageNumber = getFirstOoxmlElement(document, 'pgNumType')
  if (!pageNumber) return {}
  const startPageNo = Number(getOoxmlAttribute(pageNumber, 'start') || 1)
  const format = getOoxmlAttribute(pageNumber, 'fmt')
  return {
    pageNumber: {
      disabled: false,
      startPageNo: Number.isFinite(startPageNo) ? startPageNo : 1,
      numberType:
        format === 'chineseCounting' ? NumberType.CHINESE : NumberType.ARABIC
    }
  }
}

/** 导入行号设置，覆盖连续行号、按页重启和行号距离。 */
function importOoxmlLineNumberOptions(document: Document) {
  const lineNumber = getFirstOoxmlElement(document, 'lnNumType')
  if (!lineNumber) return {}
  const restart = getOoxmlAttribute(lineNumber, 'restart')
  return {
    lineNumber: {
      disabled: false,
      right: convertTwipToPx(getOoxmlAttribute(lineNumber, 'distance')),
      type:
        restart === 'newPage'
          ? LineNumberType.PAGE
          : LineNumberType.CONTINUITY
    }
  }
}

/** 导入页面边框，取四边首个稳定公共样式、颜色和线宽。 */
function importOoxmlPageBorderOptions(document: Document) {
  const pageBorders = getFirstOoxmlElement(document, 'pgBorders')
  if (!pageBorders) return {}
  const firstSide = getOoxmlChildElement(pageBorders, 'top')
  const padding = PAGE_BORDER_SIDE_NAMES.map(sideName => {
    const sideElement = getOoxmlChildElement(pageBorders, sideName)
    return Number(getOoxmlAttribute(sideElement, 'space') || 0)
  }) as NonNullable<IEditorOption['pageBorder']>['padding']

  return {
    pageBorder: {
      disabled: false,
      style: getImportedPageBorderStyle(getOoxmlAttribute(firstSide, 'val')),
      color: `#${getOoxmlAttribute(firstSide, 'color') || '000000'}`,
      lineWidth: convertOoxmlBorderSizeToLineWidth(
        getOoxmlAttribute(firstSide, 'sz')
      ),
      padding
    }
  }
}

/** 导入文档级背景色，OOXML 背景节点位于 w:document 直接子节点。 */
function importOoxmlDocumentBackgroundOptions(document: Document) {
  const background = getFirstOoxmlElement(document, 'background')
  const color = getOoxmlAttribute(background, 'color')
  if (!color) return {}
  return {
    background: {
      color: `#${color}`
    }
  }
}

/** 从第一个表格级 tblCellMar 恢复全局表格单元格默认内边距。 */
function importOoxmlTableDefaultOptions(document: Document) {
  const tableCellMargins = getFirstOoxmlElement(document, 'tblCellMar')
  if (!tableCellMargins) return {}
  const readPadding = (side: 'top' | 'right' | 'bottom' | 'left', index: number) => {
    const sideElement = getOoxmlChildElement(tableCellMargins, side)
    const width = getOoxmlAttribute(sideElement, 'w')
    return width !== null ? convertTwipToPx(width) : defaultTableOption.tdPadding[index]
  }
  return {
    table: {
      tdPadding: [
        readPadding('top', 0),
        readPadding('right', 1),
        readPadding('bottom', 2),
        readPadding('left', 3)
      ] as NonNullable<IEditorOption['table']>['tdPadding']
    }
  }
}

/** 从 word/document.xml 中导入第一批页面设置，形成内部 editor option 子集。 */
export function importOoxmlDocumentOptions(
  documentXml: string | Document
): Partial<IEditorOption> {
  const document = createOoxmlXmlDocument(documentXml)
  return {
    ...importOoxmlPageSizeOptions(document),
    ...importOoxmlPageMarginOptions(document),
    ...importOoxmlPageColumnOptions(document),
    ...importOoxmlLineNumberOptions(document),
    ...importOoxmlPageNumberOptions(document),
    ...importOoxmlPageBorderOptions(document),
    ...importOoxmlDocumentBackgroundOptions(document),
    ...importOoxmlTableDefaultOptions(document)
  }
}
