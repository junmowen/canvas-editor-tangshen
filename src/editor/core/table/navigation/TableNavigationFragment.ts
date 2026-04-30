import { IPositionContext } from '../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'
import { ITableFragmentTransitionRequest } from './TableNavigationTypes'
import { resolveLogicalCellFromContext } from './TableNavigationAlgorithms'

interface IFragmentNavigationDeps {
  resolveSliceByPositionContext: (positionContext: IPositionContext) => ITableLayoutCellSlice | null
  getOriginalElementList: () => any[]
  getCellSlicesByLogicalCell: (payload: {
    tableId: string
    trId: string
    tdId: string
  }) => ITableLayoutCellSlice[]
}

export function resolveFragmentTransitionIndex(
  deps: IFragmentNavigationDeps,
  payload: ITableFragmentTransitionRequest
): number | null {
  const { positionContext, cursorIndex, direction } = payload
  const logicalCell = resolveLogicalCellFromContext({
    positionContext,
    resolveSliceByPositionContext: deps.resolveSliceByPositionContext,
    getOriginalElementList: deps.getOriginalElementList
  })
  if (!logicalCell) {
    return null
  }

  const table = deps.getOriginalElementList()[logicalCell.tableIndex]
  const tr = table?.trList?.[logicalCell.trIndex]
  const td = tr?.tdList?.[logicalCell.tdIndex]
  if (!table?.id || !tr?.id || !td?.id) {
    return null
  }
  if (td.rowspan > 1 || td.colspan > 1) {
    return null
  }

  const sliceList = deps
    .getCellSlicesByLogicalCell({
      tableId: table.id,
      trId: tr.id,
      tdId: td.id
    })
    .map(slice => ({
      absoluteStart: slice.absoluteStart,
      absoluteEnd: slice.absoluteEnd
    }))
  if (sliceList.length <= 1) {
    return null
  }

  const currentSliceIndex = sliceList.findIndex(
    (slice, index) =>
      (cursorIndex >= slice.absoluteStart && cursorIndex < slice.absoluteEnd) ||
      (!!sliceList[index + 1] &&
        cursorIndex >= slice.absoluteEnd - 1 &&
        cursorIndex < sliceList[index + 1].absoluteStart)
  )
  if (currentSliceIndex < 0) {
    return null
  }

  if (direction === 'prev') {
    if (currentSliceIndex === 0) {
      return null
    }
    const currentSlice = sliceList[currentSliceIndex]
    if (cursorIndex !== currentSlice.absoluteStart) {
      return null
    }
    return Math.max(0, sliceList[currentSliceIndex - 1].absoluteEnd - 1)
  }

  if (currentSliceIndex >= sliceList.length - 1) {
    return null
  }
  const currentSlice = sliceList[currentSliceIndex]
  if (cursorIndex !== currentSlice.absoluteEnd - 1) {
    return null
  }
  return sliceList[currentSliceIndex + 1].absoluteStart
}

