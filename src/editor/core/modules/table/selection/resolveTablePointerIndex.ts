/** 根据表格命中上下文解析实际编辑索引。 */
export function resolveTableAwarePointerIndex(positionContext: {
  /** 是否命中表格。 */
  isTable?: boolean
  /** 表格单元格内值索引。 */
  tdValueIndex?: number
  /** 普通文档索引。 */
  index: number
}) {
  return positionContext.isTable
    ? positionContext.tdValueIndex!
    : positionContext.index
}

/** 根据表格命中上下文解析用于读取元素的目标索引。 */
export function resolveTableAwarePointerTargetIndex(positionContext: {
  /** 是否命中表格。 */
  isTable?: boolean
  /** 表格单元格内值索引。 */
  tdValueIndex?: number
  /** 命中元素索引。 */
  hitTargetIndex?: number
  /** 普通文档索引。 */
  index: number
}) {
  return positionContext.isTable
    ? positionContext.tdValueIndex!
    : (positionContext.hitTargetIndex ?? positionContext.index)
}
