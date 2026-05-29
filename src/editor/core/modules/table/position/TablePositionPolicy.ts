import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'

/** 判断当前行是否包含行内表格。 */
export function hasInlineTableElement(elementList: IElement[]) {
  return elementList.some(
    element =>
      element.type === ElementType.TABLE && element.tableDisplay === 'inline'
  )
}

/** 为表格元素补充当前行的表格分片信息。 */
export function resolveTableFragmentForPositionElement(
  element: IElement,
  row: Pick<IRow, 'tableFragment'>
) {
  return element.type === ElementType.TABLE ? row.tableFragment : undefined
}

/** 判断非表格元素是否位于行内表格行中。 */
export function isNonTableElementInInlineTableRow(payload: {
  /** 当前元素。 */
  element: IElement
  /** 当前行是否含行内表格。 */
  isInlineTableRow: boolean
}) {
  return payload.isInlineTableRow && payload.element.type !== ElementType.TABLE
}

/** 判断当前元素是否需要递归计算表格单元格位置。 */
export function shouldComputeTableCellPosition(element: IElement) {
  return element.type === ElementType.TABLE && !element.hide
}
