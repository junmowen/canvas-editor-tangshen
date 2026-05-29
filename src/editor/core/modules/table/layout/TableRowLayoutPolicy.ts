import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import { forEachTableCell } from '../utils/TableCellTraversal'

/** 判断当前元素是否是表格。 */
export function isTableElement(element: IElement | undefined) {
  return element?.type === ElementType.TABLE
}

/** 判断当前元素是否是行内表格。 */
export function isInlineTableElement(element: IElement | undefined) {
  return !!element && isTableElement(element) && element.tableDisplay === 'inline'
}

/** 判断表格边界是否需要强制断行。 */
export function shouldBreakAtTableBoundary(payload: {
  element: IElement
  preElement: IElement | undefined
  isInlineTable: boolean
  isPreInlineTable: boolean
}) {
  const { element, preElement, isInlineTable, isPreInlineTable } = payload
  return (
    (isTableElement(element) && !isInlineTable) ||
    (isTableElement(preElement) && !isPreInlineTable)
  )
}

/** 判断当前行是否是单个表格元素行。 */
export function isSingleTableElementRow(row: IRow) {
  const rowTableElement = row.elementList[0] as IElement | undefined
  return row.elementList.length === 1 && isTableElement(rowTableElement)
}

/** 判断当前行是否包含表格元素。 */
export function hasTableElementInRow(row: IRow) {
  return row.elementList.some(isTableElement)
}

/** 若当前元素是表格，则遍历其单元格并返回 true。 */
export function visitTableCellValueList(payload: {
  element: IElement
  tableIndex: number
  visitor: Parameters<typeof forEachTableCell>[0]['visitor']
}) {
  const { element, tableIndex, visitor } = payload
  if (!isTableElement(element)) return false
  forEachTableCell({
    tableElement: element,
    tableIndex,
    visitor
  })
  return true
}

/** 判断当前行是否包含行内表格。 */
export function hasInlineTableElementInRow(row: IRow) {
  return row.elementList.some(isInlineTableElement)
}

/** 判断当前行是否需要进入表格 fragment 拆分页逻辑。 */
export function shouldFragmentTableRow(payload: {
  row: IRow
  rowOffsetY: number
  pageHeight: number
  pageLimitHeight: number
}) {
  const { row, rowOffsetY, pageHeight, pageLimitHeight } = payload
  return (
    isSingleTableElementRow(row) ||
    (hasInlineTableElementInRow(row) &&
      row.height + rowOffsetY + pageHeight > pageLimitHeight)
  )
}
