import { Draw } from '../../../draw/Draw'

interface ITableCellDblclickSession {
  multiClick: {
    lastTableCellDblclickInfo: {
      cellKey?: string
    } | null
    tableCellDblclickCount: number
  }
}

export function resolveTableCellDblclickIntent(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 指针多击会话状态，用于判断是否连续命中同一单元格。 */
  session: ITableCellDblclickSession
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: any
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
}) {
  const { draw, session, positionContext, pageNo } = payload
  const activeSlice = draw.getTargetResolver().resolveTableSliceByFragmentContext({
    tableId: positionContext.tableId!,
    trId: positionContext.trId!,
    tdId: positionContext.tdId!,
    trIndex: positionContext.trIndex,
    tdIndex: positionContext.tdIndex
  })
  const tableCellDblclickInfo = {
    tableId: positionContext.tableId,
    trIndex: positionContext.trIndex,
    tdIndex: positionContext.tdIndex,
    tdId: positionContext.tdId,
    trId: positionContext.trId,
    tdValueIndex: positionContext.tdValueIndex,
    pageNo,
    logicalTableId: activeSlice?.logicalTableId,
    logicalTrIndex: activeSlice?.logicalTrIndex,
    logicalTdIndex: activeSlice?.logicalTdIndex,
    logicalTrId: activeSlice?.logicalTrId,
    logicalTdId: activeSlice?.logicalTdId,
    cellKey: activeSlice?.cellKey
  }
  const lastDblclickInfo = session.multiClick.lastTableCellDblclickInfo
  const isSameDblclickCell = !!(
    lastDblclickInfo &&
    lastDblclickInfo.cellKey &&
    tableCellDblclickInfo.cellKey &&
    lastDblclickInfo.cellKey === tableCellDblclickInfo.cellKey
  )
  session.multiClick.tableCellDblclickCount = isSameDblclickCell
    ? session.multiClick.tableCellDblclickCount + 1
    : 1
  session.multiClick.lastTableCellDblclickInfo = tableCellDblclickInfo
  return {
    activeSlice,
    tableCellDblclickInfo,
    count: session.multiClick.tableCellDblclickCount
  }
}

/** 表格连续双击命中同一单元格后，解析整格内容选区。 */
export function resolveTableCellDblclickSelectionRange(payload: {
  /** 绘制核心实例，提供表格 target resolver。 */
  draw: Draw
  /** 表格双击状态解析结果。 */
  tableDblclick: ReturnType<typeof resolveTableCellDblclickIntent>
}): {
  /** 选区起始索引。 */
  startIndex: number
  /** 选区结束索引。 */
  endIndex: number
  /** 表格标识。 */
  tableId?: string
} | null {
  const { draw, tableDblclick } = payload
  const logicalTableIndex =
    tableDblclick.activeSlice?.logicalTableIndex ??
    (tableDblclick.tableCellDblclickInfo.logicalTableId
      ? draw
          .getTargetResolver()
          .resolveLogicalTableById(
            tableDblclick.tableCellDblclickInfo.logicalTableId
          )?.index
      : null)
  const logicalTrIndex =
    tableDblclick.tableCellDblclickInfo.logicalTrIndex ??
    tableDblclick.tableCellDblclickInfo.trIndex
  const logicalTdIndex =
    tableDblclick.tableCellDblclickInfo.logicalTdIndex ??
    tableDblclick.tableCellDblclickInfo.tdIndex
  const td =
    logicalTableIndex !== null && logicalTableIndex !== undefined && ~logicalTableIndex
      ? draw.getTargetResolver().resolveOriginalTableTdByIndex({
          tableIndex: logicalTableIndex,
          trIndex: logicalTrIndex!,
          tdIndex: logicalTdIndex!
        })?.td
      : null
  if (!td?.value?.length) return null

  const cellSliceList = draw
    .getTargetResolver()
    .getCellSlicesByCellKey(tableDblclick.tableCellDblclickInfo.cellKey)
  return {
    startIndex: cellSliceList.length
      ? Math.min(...cellSliceList.map(slice => slice.absoluteStart))
      : 0,
    endIndex: cellSliceList.length
      ? Math.max(...cellSliceList.map(slice => slice.absoluteEnd)) - 1
      : td.value.length - 1,
    tableId:
      tableDblclick.tableCellDblclickInfo.logicalTableId ||
      tableDblclick.tableCellDblclickInfo.tableId
  }
}
