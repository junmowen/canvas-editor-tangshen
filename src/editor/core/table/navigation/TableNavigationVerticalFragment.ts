import { IPositionContext } from '../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'
import { resolveLogicalCellFromContext } from './TableNavigationAlgorithms'

export function resolveVerticalFragmentTransition(payload: {
  positionContext: IPositionContext
  cursorIndex: number
  cursorPageNo: number
  nextPositionPageNo?: number
  isShiftKey: boolean
  resolveSliceByPositionContext: (positionContext: IPositionContext) => ITableLayoutCellSlice | null
  getOriginalElementList: () => any[]
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
    resolveSliceByPositionContext,
    getOriginalElementList,
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

  const logicalCell = resolveLogicalCellFromContext({
    positionContext,
    resolveSliceByPositionContext,
    getOriginalElementList
  })
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
