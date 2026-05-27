import { IPositionContext } from '../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'

export function resolveVerticalFragmentTransition(payload: {
  positionContext: IPositionContext
  cursorIndex: number
  cursorPageNo: number
  nextPositionPageNo?: number
  isShiftKey: boolean
  resolveLogicalCellFromContext: (positionContext: IPositionContext) => {
    tableIndex: number
    trIndex: number
    tdIndex: number
  } | null
  getLogicalCellSliceList: (
    tableIndex: number,
    trIndex: number,
    tdIndex: number
  ) => ITableLayoutCellSlice[]
  resolveFragmentTransitionIndex: (
    payload: { positionContext: IPositionContext; cursorIndex: number; direction: 'prev' | 'next' }
  ) => number | null
}): number | null {
  const {
    positionContext,
    cursorIndex,
    cursorPageNo,
    nextPositionPageNo,
    isShiftKey,
    resolveLogicalCellFromContext,
    getLogicalCellSliceList,
    resolveFragmentTransitionIndex
  } = payload

  if (
    isShiftKey ||
    !positionContext.isTable ||
    nextPositionPageNo === undefined ||
    nextPositionPageNo <= cursorPageNo
  ) {
    return null
  }

  const logicalCell = resolveLogicalCellFromContext(positionContext)
  if (logicalCell) {
    const sliceList = getLogicalCellSliceList(
      logicalCell.tableIndex,
      logicalCell.trIndex,
      logicalCell.tdIndex
    )
    const currentSliceIndex = sliceList.findIndex(
      slice => slice.pageNo === cursorPageNo
    )
    if (currentSliceIndex >= 0) {
      const nextSlice = sliceList[currentSliceIndex + 1]
      if (nextSlice && nextSlice.pageNo >= nextPositionPageNo) {
        return nextSlice.absoluteStart
      }
    }
  }

  return resolveFragmentTransitionIndex({
    positionContext,
    cursorIndex,
    direction: 'next'
  })
}
