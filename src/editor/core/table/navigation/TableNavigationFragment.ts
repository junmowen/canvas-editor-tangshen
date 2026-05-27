import { IPositionContext } from '../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'
import { ITableFragmentTransitionRequest } from './TableNavigationTypes'

interface IFragmentNavigationDeps {
  resolveLogicalCellFromContext: (positionContext: IPositionContext) => {
    tableIndex: number
    trIndex: number
    tdIndex: number
  } | null
  resolveTableTdByIndex: (payload: {
    tableIndex: number
    trIndex: number
    tdIndex: number
  }) => {
    table: { id?: string }
    tr: { id?: string }
    td: { id?: string; rowspan: number; colspan: number }
  } | null
  resolveSliceByPositionContext: (positionContext: IPositionContext) => ITableLayoutCellSlice | null
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
  const logicalCell = deps.resolveLogicalCellFromContext(positionContext)
  if (!logicalCell) {
    return null
  }

  const tableCell = deps.resolveTableTdByIndex(logicalCell)
  const table = tableCell?.table
  const tr = tableCell?.tr
  const td = tableCell?.td
  if (!table?.id || !tr?.id || !td?.id) {
    return null
  }
  if (td.rowspan > 1 || td.colspan > 1) {
    return null
  }

  const activeSlice = deps.resolveSliceByPositionContext(positionContext)
  const sourceSliceList = deps.getCellSlicesByLogicalCell({
    tableId: table.id,
    trId: tr.id,
    tdId: td.id
  })
  const sliceList = sourceSliceList.map(slice => ({
    absoluteStart: slice.absoluteStart,
    absoluteEnd: slice.absoluteEnd
  }))
  if (sliceList.length <= 1) {
    return null
  }
  if (direction === 'prev' && activeSlice) {
    const activeSliceIndex = sourceSliceList.findIndex(
      slice =>
        slice.fragmentTableId === activeSlice.fragmentTableId &&
        slice.fragmentTrId === activeSlice.fragmentTrId &&
        slice.fragmentTdId === activeSlice.fragmentTdId
    )
    const activeSliceStartIndex =
      activeSlice.positionList[0]?.index ?? activeSlice.absoluteStart
    if (
      activeSliceIndex > 0 &&
      cursorIndex >= activeSliceStartIndex &&
      cursorIndex < activeSlice.absoluteStart
    ) {
      return Math.max(0, sliceList[activeSliceIndex - 1].absoluteEnd - 1)
    }
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
