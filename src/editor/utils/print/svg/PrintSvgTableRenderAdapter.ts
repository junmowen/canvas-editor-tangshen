import { TdBorder } from '../../../dataset/enum/table/Table'
import { IElement, IElementPosition } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { ITd } from '../../../interface/table/Td'

type TPrintSvgTable = ITableFragmentDescriptor | IElement

function isPrintSvgTableFragment(table: TPrintSvgTable) {
  return 'logicalTableId' in table
}

/** 解析表格裁剪 ID 使用的稳定表格标识。 */
export function resolvePrintSvgTableId(table: TPrintSvgTable) {
  return 'tableId' in table ? table.tableId : table.id
}

/** 表格片段首行需要补顶部线，避免跨页片段打印时顶边丢失。 */
export function shouldPrintSvgFragmentTopBorder(payload: {
  table: TPrintSvgTable
  td: ITd
  trIndex: number
  isEmptyBorderType: boolean
  isInternalBorderType: boolean
}) {
  const { table, td, trIndex, isEmptyBorderType, isInternalBorderType } = payload
  return (
    isPrintSvgTableFragment(table) &&
    trIndex === 0 &&
    !isEmptyBorderType &&
    !isInternalBorderType &&
    !td.borderTypes?.includes(TdBorder.TOP)
  )
}

/** 表格片段渲染去重键，避免同一页同一片段被多行重复输出。 */
export function resolvePrintSvgTableFragmentRenderKey(
  table: ITableFragmentDescriptor,
  rowPosition: IElementPosition
) {
  return `${table.tableId}-${rowPosition.pageNo}-${table.fragmentOrder}`
}
