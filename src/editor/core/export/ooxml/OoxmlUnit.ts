import { NumberType } from '../../../dataset/enum/Common'
import { PaperDirection } from '../../../dataset/enum/Editor'
import { LineNumberType } from '../../../dataset/enum/LineNumber'
import { IEditorOption } from '../../../interface/Editor'

/** OOXML 使用 twip 作为页面尺寸和边距单位，1px 按 96DPI 折算为 15twip。 */
const PX_TO_TWIP = 15

/** OOXML 字号使用 half-point，1px 按 96DPI 折算为 0.75pt，即 1.5 half-point。 */
const PX_TO_HALF_POINT = 1.5

/** 把编辑器内部像素单位转换为 OOXML twip 单位。 */
export function convertPxToTwip(value: number | undefined) {
  return Math.max(0, Math.round((value || 0) * PX_TO_TWIP))
}

/** 把编辑器字号转换为 OOXML half-point 单位。 */
export function convertFontSizeToHalfPoint(value: number | undefined) {
  return Math.max(0, Math.round((value || 0) * PX_TO_HALF_POINT))
}

/** 把 0-255 颜色通道转换为两位 HEX。 */
function convertColorChannelToHex(value: string) {
  const channel = Math.max(0, Math.min(255, Math.round(Number(value))))
  return channel.toString(16).padStart(2, '0').toUpperCase()
}

/** 归一化 OOXML 颜色值，支持 HEX 和 rgb/rgba，无法识别时回退黑色。 */
export function normalizeOoxmlHexColor(value: string | undefined) {
  const rawColor = (value || '').trim()
  const color = rawColor.replace(/^#/, '').toUpperCase()
  if (/^[0-9A-F]{6}$/.test(color)) {
    return color
  }

  // 业务表格中常见 rgba 背景色，OOXML 第一批忽略透明度，仅保留 RGB 通道。
  const rgbMatch = rawColor.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i
  )
  if (rgbMatch) {
    return [
      convertColorChannelToHex(rgbMatch[1]),
      convertColorChannelToHex(rgbMatch[2]),
      convertColorChannelToHex(rgbMatch[3])
    ].join('')
  }
  return '000000'
}

/** 生成 OOXML 页面大小片段，第一批覆盖纸张宽高和横纵向。 */
export function createOoxmlPageSize(options: Pick<IEditorOption, 'width' | 'height' | 'paperDirection'>) {
  const width = convertPxToTwip(options.width)
  const height = convertPxToTwip(options.height)
  const orient =
    options.paperDirection === PaperDirection.HORIZONTAL
      ? ' w:orient="landscape"'
      : ''
  return `<w:pgSz w:w="${width}" w:h="${height}"${orient}/>`
}

/** 生成 OOXML 页边距片段，按编辑器 margins 的上、右、下、左顺序映射。 */
export function createOoxmlPageMargin(options: Pick<IEditorOption, 'margins' | 'gutter' | 'header' | 'footer'>) {
  const margins = options.margins || [0, 0, 0, 0]
  const [top, right, bottom, left] = margins
  const header = options.header?.top
  const footer = options.footer?.bottom
  const headerAttribute =
    typeof header === 'number' ? ` w:header="${convertPxToTwip(header)}"` : ''
  const footerAttribute =
    typeof footer === 'number' ? ` w:footer="${convertPxToTwip(footer)}"` : ''
  return `<w:pgMar w:top="${convertPxToTwip(top)}" w:right="${convertPxToTwip(right)}" w:bottom="${convertPxToTwip(bottom)}" w:left="${convertPxToTwip(left)}" w:gutter="${convertPxToTwip(options.gutter)}"${headerAttribute}${footerAttribute}/>`
}

/** 生成 OOXML 分栏片段，支持等宽分栏和自定义栏宽。 */
export function createOoxmlPageColumns(options: Pick<IEditorOption, 'columns'>) {
  const columns = options.columns
  const count = Math.max(1, Math.floor(columns?.count || 1))
  if (count <= 1) return ''

  const gap = convertPxToTwip(columns?.gap)
  const widths = (columns?.widths || [])
    .slice(0, count)
    .map(width => convertPxToTwip(width))
    .filter(width => width > 0)

  // 自定义栏宽需要关闭 equalWidth，并逐个写入 w:col，最后一栏不需要额外 space。
  if (widths.length) {
    const columnXml = widths
      .map((width, index) => {
        const space = index < widths.length - 1 ? ` w:space="${gap}"` : ''
        return `<w:col w:w="${width}"${space}/>`
      })
      .join('')
    return `<w:cols w:num="${count}" w:equalWidth="0">${columnXml}</w:cols>`
  }

  return `<w:cols w:num="${count}" w:space="${gap}"/>`
}

/** 生成 OOXML 页码设置，第一批覆盖起始页码和阿拉伯/中文数字格式。 */
export function createOoxmlPageNumberType(options: Pick<IEditorOption, 'pageNumber'>) {
  const pageNumber = options.pageNumber
  if (!pageNumber || pageNumber.disabled) return ''
  const properties: string[] = []
  if (typeof pageNumber.startPageNo === 'number' && Number.isFinite(pageNumber.startPageNo)) {
    properties.push(`w:start="${Math.max(1, Math.floor(pageNumber.startPageNo))}"`)
  }
  if (pageNumber.numberType === NumberType.CHINESE) {
    properties.push('w:fmt="chineseCounting"')
  } else if (pageNumber.numberType === NumberType.ARABIC) {
    properties.push('w:fmt="decimal"')
  }
  return properties.length ? `<w:pgNumType ${properties.join(' ')}/>` : ''
}

/** 生成 OOXML 行号设置，第一批覆盖连续行号、按页重启和行号距离。 */
export function createOoxmlLineNumberType(options: Pick<IEditorOption, 'lineNumber'>) {
  const lineNumber = options.lineNumber
  if (!lineNumber || lineNumber.disabled) return ''
  const restart =
    lineNumber.type === LineNumberType.PAGE ? 'newPage' : 'continuous'
  const distance = convertPxToTwip(lineNumber.right)
  return `<w:lnNumType w:countBy="1" w:restart="${restart}" w:distance="${distance}"/>`
}

/** 把内部页面边框样式映射为 OOXML 线型。 */
function getOoxmlPageBorderValue(style: string | undefined) {
  switch (style) {
    case 'dashed':
      return 'dashed'
    case 'dotted':
      return 'dotted'
    case 'double':
      return 'double'
    default:
      return 'single'
  }
}

/** 把页面边框线宽转换为 OOXML eighth-point 单位。 */
function convertPageBorderWidthToOoxmlSize(width: number | undefined) {
  return Math.max(1, Math.round((width || 1) * 8))
}

/** 生成单条页面边框节点，space 第一批按内部 padding 像素取整输出。 */
function createOoxmlPageBorderSide(
  side: 'top' | 'right' | 'bottom' | 'left',
  value: string,
  color: string,
  size: number,
  space: number
) {
  return `<w:${side} w:val="${value}" w:sz="${size}" w:space="${Math.max(0, Math.round(space || 0))}" w:color="${color}"/>`
}

/** 生成 OOXML 页面边框设置，覆盖四边线型、颜色、线宽和边框距离。 */
export function createOoxmlPageBorders(options: Pick<IEditorOption, 'pageBorder'>) {
  const pageBorder = options.pageBorder
  if (!pageBorder || pageBorder.disabled) return ''
  const value = getOoxmlPageBorderValue(pageBorder.style)
  const color = normalizeOoxmlHexColor(pageBorder.color)
  const size = convertPageBorderWidthToOoxmlSize(pageBorder.lineWidth)
  const padding = pageBorder.padding || [0, 0, 0, 0]
  const [top, right, bottom, left] = padding
  return `<w:pgBorders w:offsetFrom="page">${createOoxmlPageBorderSide('top', value, color, size, top)}${createOoxmlPageBorderSide('left', value, color, size, left)}${createOoxmlPageBorderSide('bottom', value, color, size, bottom)}${createOoxmlPageBorderSide('right', value, color, size, right)}</w:pgBorders>`
}

/** 生成 OOXML 文档背景色节点，w:background 必须作为 w:document 的直接子节点。 */
export function createOoxmlDocumentBackground(options: Pick<IEditorOption, 'background'>) {
  const color = options.background?.color?.trim()
  // 背景图和按页应用配置没有稳定的 WordprocessingML 同构节点，这里只导出全局背景色。
  if (!color) return ''
  return `<w:background w:color="${normalizeOoxmlHexColor(color)}"/>`
}

/** 生成第一批 DOCX 导出可用的 sectPr 页面设置片段。 */
export function createOoxmlSectionProperties(options: IEditorOption) {
  // 页面背景色属于 document-level 节点，不能写入 sectPr，否则会生成非预期的 WordprocessingML 结构。
  return `<w:sectPr>${createOoxmlPageSize(options)}${createOoxmlPageMargin(options)}${createOoxmlPageColumns(options)}${createOoxmlLineNumberType(options)}${createOoxmlPageNumberType(options)}${createOoxmlPageBorders(options)}</w:sectPr>`
}
