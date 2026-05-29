import { Draw } from '../../../draw/Draw'

/** 判断拖拽源所在表格单元格是否允许删除原内容。 */
export function isTableDragSourceDeletable(payload: {
  /** 绘制核心实例，提供表格目标解析能力。 */
  draw: Draw
  /** 拖拽前缓存的位置上下文。 */
  cachePositionContext: any
}) {
  const { draw, cachePositionContext } = payload
  if (!cachePositionContext?.isTable) return true
  const { tableId, trIndex, tdIndex } = cachePositionContext
  const tableContext = tableId
    ? draw.getTargetResolver().resolveOriginalTableById(tableId)
    : null
  const td = tableContext
    ? draw.getTargetResolver().resolveOriginalTableTdByIndex({
        tableIndex: tableContext.index,
        trIndex: trIndex!,
        tdIndex: tdIndex!
      })?.td
    : null
  return td?.deletable !== false
}
