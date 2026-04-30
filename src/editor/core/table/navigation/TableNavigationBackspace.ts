import { IPositionContext } from '../../../interface/Position'
import { ITableBackspaceNavigationResult } from './TableNavigationTypes'
import { createTablePositionContext } from './TableNavigationAlgorithms'

export function resolveBackspaceNavigation(payload: {
  positionContext: IPositionContext
  getOriginalElementList: () => any[]
}): ITableBackspaceNavigationResult | null {
  const { positionContext, getOriginalElementList } = payload
  if (!positionContext.isTable || positionContext.index === undefined) {
    return null
  }

  const originalElementList = getOriginalElementList()
  const currentElement = originalElementList[positionContext.index]
  if (!currentElement?.pagingId || (currentElement.pagingIndex ?? 0) <= 0) {
    return null
  }

  let previousTableIndex = -1
  for (let i = positionContext.index - 1; i >= 0; i--) {
    if (originalElementList[i]?.pagingId === currentElement.pagingId) {
      previousTableIndex = i
      break
    }
  }
  if (!~previousTableIndex) {
    return null
  }

  const previousElement = originalElementList[previousTableIndex]
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
      logicalTableIndex: previousTableIndex,
      logicalTrIndex: lastTrIndex,
      logicalTdIndex: targetTdIndex,
      fragmentTableId: previousElement.id,
      fragmentTrId: lastTr.id,
      fragmentTdId: targetTd.id
    }),
    nextIndex: Math.max(0, targetTd.value.length - 1)
  }
}

