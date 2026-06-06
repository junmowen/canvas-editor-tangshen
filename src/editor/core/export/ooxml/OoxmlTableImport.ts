import { ZERO } from '../../../dataset/constant/Common'
import { defaultTableOption } from '../../../dataset/constant/Table'
import { ElementType } from '../../../dataset/enum/Element'
import { TdBorder, TdSlash } from '../../../dataset/enum/table/Table'
import { IElement } from '../../../interface/Element'
import { IColgroup } from '../../../interface/table/Colgroup'
import { ITd } from '../../../interface/table/Td'
import { ITr } from '../../../interface/table/Tr'
import {
  getOoxmlAttribute,
  getOoxmlChildElement as getFirstChildElement,
  getOoxmlChildElements as getChildElements
} from './OoxmlDom'
import { resolveImportedOoxmlTableColgroup } from './OoxmlTableColgroupAdapter'
import {
  getOoxmlTableBorderElements,
  importOoxmlTableBorderConfig,
  importOoxmlTableBorderType,
  importOoxmlTableCellVerticalAlign,
  importOoxmlTableHexColor,
  importOoxmlTableTwipToPx,
  isOoxmlVerticalTableTextDirection,
  isVisibleOoxmlTableBorder,
  resolveOoxmlVerticalMergeKind,
  shouldImportOoxmlDxaTableWidth
} from './OoxmlTableImportAdapter'
import {
  applyOoxmlVerticalMergeContinuation,
  TOoxmlVerticalMergeImportMap,
  updateOoxmlVerticalMergeState
} from './OoxmlTableVerticalMergeAdapter'

/** 段落解析回调，由主文档导入模块注入，避免表格导入反向依赖整份文档解析。 */
export type TOoxmlTableParagraphParser<TOption> = (
  paragraphElement: Element,
  options: TOption
) => IElement[]

/** 解析表格级属性，恢复表格样式、边框和基础直接格式。 */
function parseOoxmlTableProperties(tableElement: Element) {
  const tableProperties = getFirstChildElement(tableElement, 'tblPr')
  if (!tableProperties) return {}
  const tableStyle = getFirstChildElement(tableProperties, 'tblStyle')
  const tableBorders = getFirstChildElement(tableProperties, 'tblBorders')
  const tableStyleId = getOoxmlAttribute(tableStyle, 'val') || undefined
  const width = parseOoxmlTableDxaWidth(tableElement)
  const borderType = tableBorders
    ? importOoxmlTableBorderType(tableBorders)
    : undefined
  const outerBorderConfig = tableBorders
    ? importOoxmlTableBorderConfig(
        getOoxmlTableBorderElements(tableBorders, [
          'top',
          'left',
          'bottom',
          'right'
        ])
      )
    : {}
  const innerBorderConfig = tableBorders
    ? importOoxmlTableBorderConfig(
        getOoxmlTableBorderElements(tableBorders, ['insideH', 'insideV'])
      )
    : {}
  const borderConfig = tableBorders
    ? importOoxmlTableBorderConfig(getChildElements(tableBorders))
    : {}
  const borderWidth =
    outerBorderConfig.borderWidth &&
    innerBorderConfig.borderWidth &&
    outerBorderConfig.borderWidth !== innerBorderConfig.borderWidth
      ? innerBorderConfig.borderWidth
      : borderConfig.borderWidth
  return {
    ...(width ? { width } : {}),
    ...(tableStyleId ? { tableStyleId } : {}),
    ...(borderType ? { borderType } : {}),
    ...(borderConfig.borderColor ? { borderColor: borderConfig.borderColor } : {}),
    ...(borderWidth ? { borderWidth } : {}),
    ...(outerBorderConfig.borderWidth &&
    borderWidth &&
    outerBorderConfig.borderWidth !== borderWidth
      ? { borderExternalWidth: outerBorderConfig.borderWidth }
      : {})
  }
}

/** 解析表格列宽，优先使用 tblGrid/gridCol，缺失时后续按单元格宽度推导。 */
function parseOoxmlTableColgroup(tableElement: Element): IColgroup[] {
  const tableGrid = getFirstChildElement(tableElement, 'tblGrid')
  return getChildElements(tableGrid as Element, 'gridCol')
    .map(gridCol => ({
      width: importOoxmlTableTwipToPx(getOoxmlAttribute(gridCol, 'w'))
    }))
    .filter(col => col.width > 0)
}

/** 只读取 dxa 或缺省类型的 tblW，避免 pct/auto 被误当 twip 列宽。 */
function parseOoxmlTableDxaWidth(tableElement: Element) {
  const tableProperties = getFirstChildElement(tableElement, 'tblPr')
  const tableWidth = getFirstChildElement(tableProperties as Element, 'tblW')
  const widthType = getOoxmlAttribute(tableWidth, 'type')
  if (!shouldImportOoxmlDxaTableWidth(widthType)) return 0
  return importOoxmlTableTwipToPx(getOoxmlAttribute(tableWidth, 'w'))
}

/** 解析表格行属性，恢复最小行高和重复表头标记。 */
function parseOoxmlTableRowProperties(rowElement: Element): Pick<
  ITr,
  'height' | 'minHeight' | 'repeatOnPageStart'
> {
  const rowProperties = getFirstChildElement(rowElement, 'trPr')
  const rowHeight = getFirstChildElement(rowProperties as Element, 'trHeight')
  const minHeight = importOoxmlTableTwipToPx(getOoxmlAttribute(rowHeight, 'val'))
  return {
    height: minHeight || defaultTableOption.defaultTrMinHeight,
    ...(minHeight ? { minHeight } : {}),
    ...(getFirstChildElement(rowProperties as Element, 'tblHeader')
      ? { repeatOnPageStart: true }
      : {})
  }
}

/** 从 tcBorders 恢复单元格四边和斜线边框配置。 */
function parseOoxmlTableCellBorders(cellProperties: Element | undefined) {
  const cellBorders = getFirstChildElement(cellProperties as Element, 'tcBorders')
  if (!cellBorders) return {}

  const borderMap: Array<[string, TdBorder]> = [
    ['top', TdBorder.TOP],
    ['right', TdBorder.RIGHT],
    ['bottom', TdBorder.BOTTOM],
    ['left', TdBorder.LEFT]
  ]
  const slashMap: Array<[string, TdSlash]> = [
    ['tr2bl', TdSlash.FORWARD],
    ['tl2br', TdSlash.BACK]
  ]
  const borderTypes = borderMap
    .filter(([localName]) =>
      isVisibleOoxmlTableBorder(getFirstChildElement(cellBorders, localName))
    )
    .map(([, borderType]) => borderType)
  const slashTypes = slashMap
    .filter(([localName]) =>
      isVisibleOoxmlTableBorder(getFirstChildElement(cellBorders, localName))
    )
    .map(([, slashType]) => slashType)
  const borderConfig = importOoxmlTableBorderConfig(getChildElements(cellBorders))

  return {
    ...(borderTypes.length ? { borderTypes } : {}),
    ...(slashTypes.length ? { slashTypes } : {}),
    ...(borderConfig.borderColor ? { borderColor: borderConfig.borderColor } : {}),
    ...(borderConfig.borderWidth ? { borderWidth: borderConfig.borderWidth } : {})
  }
}

/** 解析单元格内容，复用段落导入逻辑并保留单元格内段落结束符。 */
function parseOoxmlTableCellValue<TOption>(
  cellElement: Element,
  options: TOption,
  parseParagraphElement: TOoxmlTableParagraphParser<TOption>
) {
  const value = getChildElements(cellElement, 'p').flatMap(paragraphElement =>
    parseParagraphElement(paragraphElement, options)
  )
  return value.length ? value : [{ value: ZERO }]
}

/** 解析单元格属性，恢复宽度、合并、背景、对齐、文字方向和边框。 */
function parseOoxmlTableCell<TOption>(
  cellElement: Element,
  colIndex: number,
  options: TOption,
  parseParagraphElement: TOoxmlTableParagraphParser<TOption>
): ITd {
  const cellProperties = getFirstChildElement(cellElement, 'tcPr')
  const widthElement = getFirstChildElement(cellProperties as Element, 'tcW')
  const gridSpan = getFirstChildElement(cellProperties as Element, 'gridSpan')
  const shading = getFirstChildElement(cellProperties as Element, 'shd')
  const textDirection = getFirstChildElement(
    cellProperties as Element,
    'textDirection'
  )
  const width = importOoxmlTableTwipToPx(getOoxmlAttribute(widthElement, 'w'))
  const backgroundColor = importOoxmlTableHexColor(getOoxmlAttribute(shading, 'fill'))
  const verticalAlign = importOoxmlTableCellVerticalAlign(
    getOoxmlAttribute(getFirstChildElement(cellProperties as Element, 'vAlign'), 'val')
  )

  return {
    colspan: Math.max(1, Number(getOoxmlAttribute(gridSpan, 'val') || 1)),
    rowspan: 1,
    colIndex,
    value: parseOoxmlTableCellValue(cellElement, options, parseParagraphElement),
    ...(width ? { width } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(verticalAlign ? { verticalAlign } : {}),
    ...(isOoxmlVerticalTableTextDirection(getOoxmlAttribute(textDirection, 'val'))
      ? { textDirection: 'vertical' as const }
      : {}),
    ...parseOoxmlTableCellBorders(cellProperties)
  }
}

/** 解析单行表格，并把纵向合并 continuation 累加到起点单元格。 */
function parseOoxmlTableRow<TOption>(
  rowElement: Element,
  options: TOption,
  verticalMergeMap: TOoxmlVerticalMergeImportMap,
  parseParagraphElement: TOoxmlTableParagraphParser<TOption>
): ITr {
  const rowProperties = parseOoxmlTableRowProperties(rowElement)
  const tdList: ITd[] = []
  let colIndex = 0

  for (const cellElement of getChildElements(rowElement, 'tc')) {
    const gridSpan = Math.max(
      1,
      Number(
        getOoxmlAttribute(
          getFirstChildElement(
            getFirstChildElement(cellElement, 'tcPr') as Element,
            'gridSpan'
          ),
          'val'
        ) || 1
      )
    )
    const verticalMergeKind = resolveOoxmlVerticalMergeKind(cellElement)

    if (verticalMergeKind === 'continue') {
      const mergedColspan = applyOoxmlVerticalMergeContinuation(
        verticalMergeMap,
        colIndex
      )
      if (mergedColspan) {
        colIndex += mergedColspan
        continue
      }
    }

    const td = parseOoxmlTableCell(
      cellElement,
      colIndex,
      options,
      parseParagraphElement
    )
    tdList.push(td)

    updateOoxmlVerticalMergeState({
      verticalMergeMap,
      colIndex,
      td,
      isRestart: verticalMergeKind === 'restart'
    })
    colIndex += gridSpan
  }

  return {
    ...rowProperties,
    tdList
  }
}

/** 解析 w:tbl 为内部表格元素，作为正文 main 中的块级对象。 */
export function parseOoxmlTableElement<TOption>(
  tableElement: Element,
  options: TOption,
  parseParagraphElement: TOoxmlTableParagraphParser<TOption>
): IElement {
  const tableWidth = parseOoxmlTableDxaWidth(tableElement)
  const parsedColgroup = parseOoxmlTableColgroup(tableElement)
  const verticalMergeMap: TOoxmlVerticalMergeImportMap = new Map()
  const trList = getChildElements(tableElement, 'tr').map(rowElement =>
    parseOoxmlTableRow(rowElement, options, verticalMergeMap, parseParagraphElement)
  )
  const colgroup = resolveImportedOoxmlTableColgroup({
    parsedColgroup,
    trList,
    tableWidth
  })
  const width = colgroup.reduce((sum, col) => sum + col.width, 0)

  return {
    type: ElementType.TABLE,
    value: '',
    ...(width ? { width } : {}),
    ...(colgroup.length ? { colgroup } : {}),
    trList,
    ...parseOoxmlTableProperties(tableElement)
  }
}
