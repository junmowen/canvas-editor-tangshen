import { IPositionContext } from '../../../../interface/Position'
import { IRange } from '../../../../interface/Range'

/** Shift 点击仍在同一表格单元格内时，解析扩展选区边界。 */
export function resolveTableShiftSelectionBoundary(payload: {
  /** 当前命中位置上下文。 */
  positionContext: IPositionContext
  /** 旧命中单元格标识。 */
  oldPositionContextTdId?: string
  /** 当前命中索引。 */
  curIndex: number
  /** 旧选区起始索引。 */
  oldStartIndex: number
  /** 当前选区起始索引。 */
  startIndex: number
  /** 当前选区结束索引。 */
  endIndex: number
}) {
  const {
    positionContext,
    oldPositionContextTdId,
    curIndex,
    oldStartIndex,
    startIndex,
    endIndex
  } = payload
  if (!~oldStartIndex || positionContext.tdId !== oldPositionContextTdId) {
    return { startIndex, endIndex }
  }
  if (curIndex > oldStartIndex) {
    return { startIndex: oldStartIndex, endIndex }
  }
  return { startIndex, endIndex: oldStartIndex }
}

/** 判断 range 是否为表格跨行列选区。 */
export function isTableCrossRowColSelectionRange(range: IRange) {
  return !!(
    range.tableId &&
    range.startTdIndex !== undefined &&
    range.endTdIndex !== undefined &&
    range.startTrIndex !== undefined &&
    range.endTrIndex !== undefined
  )
}
