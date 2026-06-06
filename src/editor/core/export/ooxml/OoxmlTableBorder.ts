import { defaultTableOption } from '../../../dataset/constant/Table'
import { TableBorder, TdBorder, TdSlash } from '../../../dataset/enum/table/Table'
import { IElement } from '../../../interface/Element'
import { IEditorOption } from '../../../interface/Editor'
import { ITd } from '../../../interface/table/Td'
import { convertPxToTwip, normalizeOoxmlHexColor } from './OoxmlUnit'

/** OOXML 表格边框边位，限定 tblBorders/tcBorders 可写入的边框节点。 */
type OoxmlBorderSide =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'insideH'
  | 'insideV'
  | 'tl2br'
  | 'tr2bl'

/** 表格边框配置，描述单条边框写入 OOXML 时需要的线型、颜色和宽度。 */
interface IOoxmlBorderConfig {
  /** 边框线型，single 为实线，dashed 为虚线，nil 表示无边框。 */
  value: 'single' | 'dashed' | 'nil'
  /** 边框颜色，使用 OOXML 要求的大写 6 位 HEX。 */
  color?: string
  /** 边框宽度，使用 OOXML eighth-point 单位。 */
  size?: number
}

/** 表格属性导出上下文，承载全局表格默认配置。 */
export type TOoxmlTableExportOptions = Pick<IEditorOption, 'table'>

/** 表格外边框顺序，输出时保持 WordprocessingML 的常用节点顺序。 */
const OOXML_TABLE_OUTER_SIDES: OoxmlBorderSide[] = [
  'top',
  'left',
  'bottom',
  'right'
]

/** 表格内边框顺序，insideH 表示行间线，insideV 表示列间线。 */
const OOXML_TABLE_INNER_SIDES: OoxmlBorderSide[] = ['insideH', 'insideV']

/** 单元格四边顺序，业务只配置单元格颜色或宽度时按完整四边导出。 */
const OOXML_TD_ALL_SIDES: OoxmlBorderSide[] = [
  'top',
  'left',
  'bottom',
  'right'
]

/** 单元格边框枚举到 OOXML 边位的映射表。 */
const TD_BORDER_SIDE_MAP: Record<TdBorder, OoxmlBorderSide> = {
  [TdBorder.TOP]: 'top',
  [TdBorder.RIGHT]: 'right',
  [TdBorder.BOTTOM]: 'bottom',
  [TdBorder.LEFT]: 'left'
}

/** 单元格斜线方向到 OOXML 对角边框的映射表。 */
const TD_SLASH_SIDE_MAP: Record<TdSlash, OoxmlBorderSide> = {
  [TdSlash.FORWARD]: 'tr2bl',
  [TdSlash.BACK]: 'tl2br'
}

/** 转义表格属性中的 XML 字符，避免样式 id 破坏 OOXML。 */
function escapeOoxmlTableAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 把内部表格边框宽度转换为 OOXML eighth-point 宽度。 */
export function convertTableBorderWidthToOoxmlSize(width: number | undefined) {
  return Math.max(1, Math.round((width || 1) * 8))
}

/** 解析表格导出边框类型，内部渲染层把空 borderType 视为默认全边框。 */
function resolveOoxmlTableBorderType(element: IElement) {
  return element.borderType || TableBorder.ALL
}

/** 生成一条 OOXML 边框节点，无边框只写 nil，避免无意义颜色和宽度干扰。 */
function createOoxmlBorderNode(side: OoxmlBorderSide, config: IOoxmlBorderConfig) {
  if (config.value === 'nil') {
    return `<w:${side} w:val="nil"/>`
  }
  return `<w:${side} w:val="${config.value}" w:sz="${config.size}" w:color="${config.color}" w:space="0"/>`
}

/** 生成可见边框配置，按表格类型决定实线或虚线。 */
function createVisibleBorderConfig(
  borderType: TableBorder | undefined,
  color: string | undefined,
  width: number | undefined
): IOoxmlBorderConfig {
  return {
    value: borderType === TableBorder.DASH ? 'dashed' : 'single',
    color: normalizeOoxmlHexColor(color || defaultTableOption.defaultBorderColor),
    size: convertTableBorderWidthToOoxmlSize(width)
  }
}

/** 生成无边框配置，用于 EMPTY 或明确关闭的内外边框。 */
function createNilBorderConfig(): IOoxmlBorderConfig {
  return { value: 'nil' }
}

/** 根据边位集合生成表格边框 XML。 */
function createOoxmlTableBorderNodes(
  sideList: OoxmlBorderSide[],
  config: IOoxmlBorderConfig
) {
  return sideList.map(side => createOoxmlBorderNode(side, config)).join('')
}

/** 生成表格级 tblBorders，覆盖全边框、外边框、内边框、虚线和空边框。 */
export function createOoxmlTableBorders(element: IElement) {
  const borderType = resolveOoxmlTableBorderType(element)

  const visibleConfig = createVisibleBorderConfig(
    borderType,
    element.borderColor,
    element.borderWidth
  )
  const externalConfig = createVisibleBorderConfig(
    borderType,
    element.borderColor,
    element.borderExternalWidth || element.borderWidth
  )
  const nilConfig = createNilBorderConfig()
  const allSides = [...OOXML_TABLE_OUTER_SIDES, ...OOXML_TABLE_INNER_SIDES]

  // 空边框需要显式写 nil，避免 Word 使用默认表格边框样式。
  if (borderType === TableBorder.EMPTY) {
    return `<w:tblBorders>${createOoxmlTableBorderNodes(allSides, nilConfig)}</w:tblBorders>`
  }

  // 外边框只写外侧可见线，内部线显式关闭，避免导出后出现隐式网格线。
  if (borderType === TableBorder.EXTERNAL) {
    return `<w:tblBorders>${createOoxmlTableBorderNodes(
      OOXML_TABLE_OUTER_SIDES,
      externalConfig
    )}${createOoxmlTableBorderNodes(OOXML_TABLE_INNER_SIDES, nilConfig)}</w:tblBorders>`
  }

  // 内边框只写行列间线，外框显式关闭以贴合内部模型语义。
  if (borderType === TableBorder.INTERNAL) {
    return `<w:tblBorders>${createOoxmlTableBorderNodes(
      OOXML_TABLE_OUTER_SIDES,
      nilConfig
    )}${createOoxmlTableBorderNodes(OOXML_TABLE_INNER_SIDES, visibleConfig)}</w:tblBorders>`
  }

  // 全边框和虚线边框都覆盖内外全部边位，虚线由 visibleConfig 决定线型。
  return `<w:tblBorders>${createOoxmlTableBorderNodes(allSides, visibleConfig)}</w:tblBorders>`
}

/** 生成表格样式节点，保留内部 tableStyleId 供 Word 表格样式系统消费。 */
function createOoxmlTableStyle(element: IElement) {
  if (!element.tableStyleId) return ''
  return `<w:tblStyle w:val="${escapeOoxmlTableAttribute(element.tableStyleId)}"/>`
}

/** 生成表格总宽，显式锁定表格占位，避免 WPS/Word 按默认样式重新拉伸。 */
function createOoxmlTableWidth(element: IElement) {
  const width =
    element.width ||
    (element.colgroup || []).reduce((sum, col) => sum + col.width, 0)
  return width > 0 ? `<w:tblW w:w="${convertPxToTwip(width)}" w:type="dxa"/>` : ''
}

/** 生成固定表格布局，确保列宽使用内部 colgroup，不被 Office 自动重算。 */
function createOoxmlTableLayout(element: IElement) {
  return element.colgroup?.length ? '<w:tblLayout w:type="fixed"/>' : ''
}

/** 生成表格默认单元格内边距，避免 Word/WPS 使用默认 padding 后重新撑高跨页表格。 */
function createOoxmlTableCellMargins(options?: TOoxmlTableExportOptions) {
  const [top, right, bottom, left] =
    options?.table?.tdPadding || defaultTableOption.tdPadding
  return `<w:tblCellMar><w:top w:w="${convertPxToTwip(top)}" w:type="dxa"/><w:left w:w="${convertPxToTwip(left)}" w:type="dxa"/><w:bottom w:w="${convertPxToTwip(bottom)}" w:type="dxa"/><w:right w:w="${convertPxToTwip(right)}" w:type="dxa"/></w:tblCellMar>`
}

/** 生成表格属性节点，承载表格宽度、固定布局、样式和表格级边框。 */
export function createOoxmlTableProperties(
  element: IElement,
  options?: TOoxmlTableExportOptions
) {
  const properties = [
    createOoxmlTableWidth(element),
    createOoxmlTableLayout(element),
    createOoxmlTableCellMargins(options),
    createOoxmlTableStyle(element),
    createOoxmlTableBorders(element)
  ]
    .filter(Boolean)
    .join('')
  return properties ? `<w:tblPr>${properties}</w:tblPr>` : ''
}

/** 判断单元格是否只有颜色或宽度直接格式，需要映射到四边。 */
function shouldExportAllCellSides(td: ITd) {
  return Boolean(td.borderColor || td.borderWidth)
}

/** 生成单元格级 tcBorders，输出显式边位、斜线边框和直接格式四边。 */
export function createOoxmlTableCellBorders(element: IElement, td: ITd) {
  const borderTypes = td.borderTypes || []
  const slashTypes = td.slashTypes || []
  const shouldUseAllCellSides =
    !borderTypes.length && !slashTypes.length && shouldExportAllCellSides(td)
  if (!borderTypes.length && !slashTypes.length && !shouldUseAllCellSides) {
    return ''
  }

  const config = createVisibleBorderConfig(
    resolveOoxmlTableBorderType(element),
    td.borderColor || element.borderColor,
    td.borderWidth || element.borderWidth
  )
  const borderSideList = shouldUseAllCellSides
    ? OOXML_TD_ALL_SIDES
    : borderTypes
        .map(borderType => TD_BORDER_SIDE_MAP[borderType])
        .filter((side): side is OoxmlBorderSide => !!side)
  const borderNodes = borderSideList
    .map(side => createOoxmlBorderNode(side, config))
    .join('')
  const slashNodes = slashTypes
    .map(slashType => TD_SLASH_SIDE_MAP[slashType])
    .filter((side): side is OoxmlBorderSide => !!side)
    .map(side => createOoxmlBorderNode(side, config))
    .join('')

  return borderNodes || slashNodes
    ? `<w:tcBorders>${borderNodes}${slashNodes}</w:tcBorders>`
    : ''
}
