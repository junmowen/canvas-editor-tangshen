import { ZERO } from '../../../dataset/constant/Common'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { isBlockElement } from '../../modules/block/layout/BlockElementLayout'
import { isChartGraphicElement } from '../../modules/chart-graphics/layout/ChartGraphicElementLayout'
import { resolveValueStartIndentOffset } from '../../modules/control/layout/ControlRowLayoutPolicy'
import { isPageBreakElement } from '../../modules/page-break/layout/PageBreakElementLayout'
import { shouldApplyRowFlexSpacing } from '../../modules/paragraph/layout/ParagraphRowLayoutPolicy'
import type { Draw } from '../Draw'
import { applyWrappedRowOffset } from './RowLayoutOffsetPolicy'
import { applyCjkLatinSpacingToPreviousElement } from './RowLayoutTypographyPolicy'

/** 创建布局计算用的初始行列表。 */
export function createInitialRowList(elementList: IElement[]) {
  const rowList: IRow[] = []
  if (elementList.length) {
    rowList.push({
      width: 0,
      height: 0,
      ascent: 0,
      elementList: [],
      startIndex: 0,
      rowIndex: 0,
      rowFlex: elementList?.[0]?.rowFlex || elementList?.[1]?.rowFlex,
      columns: elementList?.[0]?.columns || elementList?.[1]?.columns
    })
  }
  return rowList
}

/** 收尾当前行宽度状态，处理宽度不足标记和 rowFlex 间距分配。 */
export function finalizeRowWidthState(payload: {
  row: IRow
  preElement?: IElement
  availableWidth: number
  isWidthNotEnough: boolean
  isForceBreak: boolean
}) {
  const {
    row,
    preElement,
    availableWidth,
    isWidthNotEnough,
    isForceBreak
  } = payload
  row.isWidthNotEnough = isWidthNotEnough && !isForceBreak
  if (shouldApplyRowFlexSpacing({ row, preElement })) {
    const rowElementList =
      row.elementList[0]?.value === ZERO
        ? row.elementList.slice(1)
        : row.elementList
    const gap = (availableWidth - row.width) / (rowElementList.length - 1)
    for (let e = 0; e < rowElementList.length - 1; e++) {
      const el = rowElementList[e]
      el.metrics.width += gap
    }
    row.width = availableWidth
  }
}

/** 将测量后的行内元素追加到当前行。 */
export function appendRowElementToCurrentRow(payload: {
  row: IRow
  rowElement: IRowElement
  elementList: IElement[]
  elementIndex: number
  metricsWidth: number
  height: number
  ascent: number
  cjkLatinSpacing: number
  defaultBasicRowMarginHeight: number
}) {
  const {
    row,
    rowElement,
    elementList,
    elementIndex,
    metricsWidth,
    height,
    ascent,
    cjkLatinSpacing,
    defaultBasicRowMarginHeight
  } = payload
  applyCjkLatinSpacingToPreviousElement({
    row,
    spacing: cjkLatinSpacing
  })
  row.width += metricsWidth
  if (
    elementIndex === 0 &&
    (isBlockElement(elementList[1]) ||
      isChartGraphicElement(elementList[1]) ||
      !!elementList[1]?.areaId)
  ) {
    row.height = defaultBasicRowMarginHeight
    row.ascent = defaultBasicRowMarginHeight
  } else if (row.height < height) {
    row.height = height
    row.ascent = ascent
  }
  row.elementList.push(rowElement)
}

/** 创建换行后的新行，并应用列表、控件起始缩进和区域偏移。 */
export function createWrappedRow(payload: {
  draw: Draw
  curRow: IRow
  rowElement: IRowElement
  element: IElement
  elementList: IElement[]
  elementIndex: number
  metricsWidth: number
  height: number
  ascent: number
  listStyleOffsetX: number
  listIndex: number
  scale: number
  isFromTable: boolean
}) {
  const {
    draw,
    curRow,
    rowElement,
    element,
    elementList,
    elementIndex,
    metricsWidth,
    height,
    ascent,
    listStyleOffsetX,
    listIndex,
    scale,
    isFromTable
  } = payload
  const row: IRow = {
    width: metricsWidth,
    height,
    startIndex: elementIndex,
    elementList: [rowElement],
    ascent,
    rowIndex: curRow.rowIndex + 1,
    rowFlex: elementList[elementIndex]?.rowFlex || elementList[elementIndex + 1]?.rowFlex,
    columns: element.columns,
    isPageBreak: isPageBreakElement(element)
  }
  applyWrappedRowOffset({
    row,
    element,
    listStyleOffsetX,
    scale
  })

  const valueStartOffsetX = resolveValueStartIndentOffset({
    draw,
    row: curRow,
    rowElement
  })
  if (valueStartOffsetX !== null) {
    row.offsetX = valueStartOffsetX
  }

  if (element.listId) {
    row.isList = true
    row.offsetX = listStyleOffsetX
    row.rowFlexOffsetX = listStyleOffsetX
    row.listIndex = listIndex
  }

  row.offsetY =
    !isFromTable &&
    element.area?.top &&
    element.areaId !== elementList[elementIndex - 1]?.areaId
      ? element.area.top * scale
      : 0
  return row
}
