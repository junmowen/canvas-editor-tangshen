/** 判断拖拽提交是否仍落在原始表格单元格内。 */
export function isDragDropWithinSameTableCell(payload: {
  /** 拖拽快照命中上下文。 */
  snapshotPositionContext?: { tdId?: string } | null
  /** 当前命中上下文。 */
  positionContext: { tdId?: string }
}) {
  const { snapshotPositionContext, positionContext } = payload
  return snapshotPositionContext?.tdId === positionContext.tdId
}
