import { CanvasEvent } from '../../../CanvasEvent'

export function resolveTableCellDblclickIntent(payload: {
  host: CanvasEvent
  positionContext: any
  pageNo: number
}) {
  const { host, positionContext, pageNo } = payload
  const draw = host.getDraw()
  const session = host.getPointerSession()
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
