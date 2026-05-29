import { IPositionContext } from '../../../../interface/Position'
import { ITableBackspaceNavigationResult } from './TableNavigationTypes'
import { createTablePositionContext } from './TableNavigationAlgorithms'

export function resolveBackspaceNavigation(payload: {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** resolvepreviouspaging表格，用于保存或定位表格结构。 */
  resolvePreviousPagingTable: (positionContext: IPositionContext) => {
    /** 当前元素，用于定位或修改对应文档节点。 */
    currentElement: any
    /** previous索引，用于定位对应元素、行或片段。 */
    previousIndex: number
    /** previous元素，用于定位或修改对应文档节点。 */
    previousElement: any
  } | null
}): ITableBackspaceNavigationResult | null {
  const { positionContext, resolvePreviousPagingTable } = payload
  const pagingTable = resolvePreviousPagingTable(positionContext)
  if (!pagingTable) return null
  const { currentElement, previousIndex, previousElement } = pagingTable
  const previousTrList = previousElement.trList || []
  let lastTrIndex = previousTrList.length - 1
  while (lastTrIndex >= 0 && previousTrList[lastTrIndex].pagingRepeat) {
    lastTrIndex--
  }
  if (lastTrIndex < 0) {
    return null
  }

  const lastTr = previousTrList[lastTrIndex]
  const currentTd =
    currentElement.trList?.[positionContext.trIndex ?? 0]?.tdList?.[
      positionContext.tdIndex ?? 0
    ]
  const currentColIndex = currentTd?.colIndex ?? positionContext.tdIndex ?? 0

  const targetTdIndex = lastTr.tdList.findIndex((td: any) => {
    return (
      td.colIndex === currentColIndex ||
      (td.colIndex !== undefined &&
        td.colIndex + td.colspan - 1 >= currentColIndex &&
        td.colIndex <= currentColIndex)
    )
  })
  if (targetTdIndex < 0) {
    return null
  }

  const targetTd = lastTr.tdList[targetTdIndex]
  return {
    nextPositionContext: createTablePositionContext({
      logicalTableIndex: previousIndex,
      logicalTrIndex: lastTrIndex,
      logicalTdIndex: targetTdIndex,
      fragmentTableId: previousElement.id,
      fragmentTrId: lastTr.id,
      fragmentTdId: targetTd.id
    }),
    nextIndex: Math.max(0, targetTd.value.length - 1)
  }
}
