import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import { TableBorder } from '../../../dataset/enum/table/Table'
import {
  getOoxmlAttribute,
  getOoxmlChildElement as getFirstChildElement,
  getOoxmlChildElements as getChildElements
} from './OoxmlDom'

/** OOXML twip 到内部 px 的换算比例，必须和导出侧 px->twip 保持互逆。 */
const TWIP_TO_PX = 1 / 15

/** OOXML 表格边框解析结果，用于恢复表格级和单元格级直接格式。 */
export interface IOoxmlImportedBorder {
  /** 边框线型，导入侧第一批只区分实线和虚线。 */
  borderType?: TableBorder
  /** 边框颜色，恢复为内部 #RRGGBB。 */
  borderColor?: string
  /** 边框宽度，恢复为内部像素单位。 */
  borderWidth?: number
}

export type TOoxmlVerticalMergeKind = 'restart' | 'continue' | 'none'

/** 把 OOXML HEX 颜色还原为内部颜色字符串。 */
export function importOoxmlTableHexColor(value: string | null | undefined) {
  if (!value || value === 'auto') return undefined
  return `#${value.toUpperCase()}`
}

/** 把 OOXML twip 数值转换为编辑器内部像素。 */
export function importOoxmlTableTwipToPx(value: string | null | undefined) {
  const twipValue = Number(value || 0)
  return Number.isFinite(twipValue) ? Math.round(twipValue * TWIP_TO_PX) : 0
}

/** 把 OOXML 边框 eighth-point 宽度转换为内部边框宽度。 */
function importOoxmlTableBorderWidth(value: string | null | undefined) {
  const borderSize = Number(value || 0)
  return Number.isFinite(borderSize) && borderSize > 0
    ? Math.max(1, Math.round(borderSize / 8))
    : undefined
}

/** 判断 OOXML 边框节点是否可见。 */
export function isVisibleOoxmlTableBorder(borderElement: Element | undefined) {
  return Boolean(borderElement && getOoxmlAttribute(borderElement, 'val') !== 'nil')
}

/** 从多个边框节点中取第一个可见边框。 */
function getFirstVisibleOoxmlTableBorder(borderElementList: Element[]) {
  return borderElementList.find(isVisibleOoxmlTableBorder)
}

/** 解析 OOXML 边框节点列表为内部边框颜色、宽度和线型。 */
export function importOoxmlTableBorderConfig(
  borderElementList: Element[]
): IOoxmlImportedBorder {
  const visibleBorder = getFirstVisibleOoxmlTableBorder(borderElementList)
  if (!visibleBorder) return {}
  const borderValue = getOoxmlAttribute(visibleBorder, 'val')
  return {
    borderType:
      borderValue === 'dashed' || borderValue === 'dash'
        ? TableBorder.DASH
        : undefined,
    borderColor: importOoxmlTableHexColor(
      getOoxmlAttribute(visibleBorder, 'color')
    ),
    borderWidth: importOoxmlTableBorderWidth(
      getOoxmlAttribute(visibleBorder, 'sz')
    )
  }
}

/** 按边位名称提取表格边框节点，便于区分外框和内线宽度。 */
export function getOoxmlTableBorderElements(
  tableBorders: Element,
  names: string[]
) {
  return names.flatMap(name => getChildElements(tableBorders, name))
}

/** 从 tblBorders 推导内部表格边框类型。 */
export function importOoxmlTableBorderType(tableBorders: Element) {
  const top = getFirstChildElement(tableBorders, 'top')
  const left = getFirstChildElement(tableBorders, 'left')
  const bottom = getFirstChildElement(tableBorders, 'bottom')
  const right = getFirstChildElement(tableBorders, 'right')
  const insideH = getFirstChildElement(tableBorders, 'insideH')
  const insideV = getFirstChildElement(tableBorders, 'insideV')
  const outerVisible = [top, left, bottom, right].some(isVisibleOoxmlTableBorder)
  const innerVisible = [insideH, insideV].some(isVisibleOoxmlTableBorder)
  const borderConfig = importOoxmlTableBorderConfig(
    getChildElements(tableBorders).filter(element =>
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].includes(
        element.localName
      )
    )
  )

  if (!outerVisible && !innerVisible) return TableBorder.EMPTY
  if (borderConfig.borderType === TableBorder.DASH) return TableBorder.DASH
  if (outerVisible && !innerVisible) return TableBorder.EXTERNAL
  if (!outerVisible && innerVisible) return TableBorder.INTERNAL
  return TableBorder.ALL
}

/** 只读取 dxa 或缺省类型的表格宽度，避免 pct/auto 被误当 twip 列宽。 */
export function shouldImportOoxmlDxaTableWidth(
  widthType: string | null | undefined
) {
  return !widthType || widthType === 'dxa'
}

/** 解析单元格垂直对齐，OOXML center 对应内部 middle。 */
export function importOoxmlTableCellVerticalAlign(
  value: string | null | undefined
) {
  if (value === 'center') return VerticalAlign.MIDDLE
  if (value === 'bottom') return VerticalAlign.BOTTOM
  if (value === 'top') return VerticalAlign.TOP
  return undefined
}

/** 判断 OOXML 单元格文字方向是否属于内部可表达的竖排语义。 */
export function isOoxmlVerticalTableTextDirection(
  value: string | null | undefined
) {
  return value === 'tbRl' || value === 'tbRlV' || value === 'btLr'
}

/** 判断 OOXML 单元格纵向合并语义。 */
export function resolveOoxmlVerticalMergeKind(
  cellElement: Element
): TOoxmlVerticalMergeKind {
  const cellProperties = getFirstChildElement(cellElement, 'tcPr')
  const verticalMerge = getFirstChildElement(cellProperties as Element, 'vMerge')
  if (!verticalMerge) return 'none'
  const value = getOoxmlAttribute(verticalMerge, 'val')
  if (value === 'restart') return 'restart'
  return !value || value === 'continue' ? 'continue' : 'none'
}
