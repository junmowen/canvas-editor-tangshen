import { IElementPosition } from '../../../interface/Element'
import { IPositionContext } from '../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'

export interface IResolvedLogicalCell {
  tableIndex: number
  trIndex: number
  tdIndex: number
}

export function createTablePositionContext(payload: {
  slice?: ITableLayoutCellSlice | null
  logicalTableIndex?: number
  logicalTrIndex?: number
  logicalTdIndex?: number
  fragmentTableId?: string
  fragmentTrId?: string
  fragmentTdId?: string
}): IPositionContext {
  const {
    slice,
    logicalTableIndex,
    logicalTrIndex,
    logicalTdIndex,
    fragmentTableId,
    fragmentTrId,
    fragmentTdId
  } = payload

  return {
    isTable: true,
    index: slice?.logicalTableIndex ?? logicalTableIndex,
    trIndex: slice?.logicalTrIndex ?? logicalTrIndex,
    tdIndex: slice?.logicalTdIndex ?? logicalTdIndex,
    tableId: fragmentTableId ?? slice?.fragmentTableId ?? slice?.logicalTableId,
    trId: fragmentTrId ?? slice?.fragmentTrId ?? slice?.logicalTrId,
    tdId: fragmentTdId ?? slice?.fragmentTdId ?? slice?.logicalTdId
  }
}

export function resolveLogicalCellFromContext(payload: {
  positionContext: IPositionContext
  resolveSliceByPositionContext: (
    positionContext: IPositionContext
  ) => ITableLayoutCellSlice | null
  getOriginalElementList: () => Array<{
    id?: string
    trList?: Array<{
      id?: string
      tdList: Array<{ id?: string }>
    }>
  }>
}): IResolvedLogicalCell | null {
  const { positionContext, resolveSliceByPositionContext, getOriginalElementList } =
    payload
  const activeSlice = resolveSliceByPositionContext(positionContext)
  if (activeSlice) {
    return {
      tableIndex: activeSlice.logicalTableIndex,
      trIndex: activeSlice.logicalTrIndex,
      tdIndex: activeSlice.logicalTdIndex
    }
  }

  const { index, trIndex, tdIndex } = positionContext
  if (index === undefined || trIndex === undefined || tdIndex === undefined) {
    return null
  }

  const table = getOriginalElementList()[index]
  const tr = table?.trList?.[trIndex]
  const td = tr?.tdList?.[tdIndex]
  if (!table?.id || !tr?.id || !td?.id) {
    return null
  }

  return {
    tableIndex: index,
    trIndex,
    tdIndex
  }
}

export function resolveVerticalTargetSlice(payload: {
  sliceList: ITableLayoutCellSlice[]
  referencePageNo?: number
  direction: 'up' | 'down'
}): ITableLayoutCellSlice | null {
  const { sliceList, referencePageNo, direction } = payload
  if (!sliceList.length) {
    return null
  }
  if (referencePageNo === undefined) {
    return direction === 'up'
      ? sliceList[sliceList.length - 1] || null
      : sliceList[0] || null
  }

  const samePageSlice =
    sliceList.find(slice => slice.pageNo === referencePageNo) || null
  if (samePageSlice) {
    return samePageSlice
  }

  if (direction === 'up') {
    for (let i = sliceList.length - 1; i >= 0; i--) {
      if (sliceList[i].pageNo <= referencePageNo) {
        return sliceList[i]
      }
    }
    return sliceList[0] || null
  }

  for (let i = 0; i < sliceList.length; i++) {
    if (sliceList[i].pageNo >= referencePageNo) {
      return sliceList[i]
    }
  }
  return sliceList[sliceList.length - 1] || null
}

export function resolveVerticalIndexWithinCurrentCell(payload: {
  positionList: IElementPosition[]
  cursorIndex: number
  direction: 'up' | 'down'
  currentPosition?: IElementPosition | null
}): number | null {
  const { positionList, cursorIndex, direction } = payload
  const currentPosition = payload.currentPosition || positionList[cursorIndex]
  if (!currentPosition) {
    return null
  }
  const currentPositionIndex =
    payload.currentPosition &&
    positionList[cursorIndex]?.pageNo !== payload.currentPosition.pageNo
      ? positionList.findIndex(position => {
          const currentLeftTop = payload.currentPosition!.coordinate.leftTop
          const leftTop = position.coordinate.leftTop
          return (
            position.pageNo === payload.currentPosition!.pageNo &&
            position.value === payload.currentPosition!.value &&
            Math.abs(leftTop[0] - currentLeftTop[0]) < 0.5 &&
            Math.abs(leftTop[1] - currentLeftTop[1]) < 0.5
          )
        })
      : cursorIndex
  const scanCursorIndex = currentPositionIndex >= 0 ? currentPositionIndex : cursorIndex

  if (direction === 'up' && currentPosition.isFirstLetter) {
    return null
  }

  const cursorX = currentPosition.coordinate.rightTop[0]
  const currentRowNo = currentPosition.rowNo
  const probablePosition: IElementPosition[] = []

  if (direction === 'up') {
    for (let cursor = scanCursorIndex - 1; cursor >= 0; cursor--) {
      const position = positionList[cursor]
      if (!position || position.rowNo === currentRowNo) continue
      if (probablePosition[0] && probablePosition[0].rowNo !== position.rowNo) {
        break
      }
      probablePosition.unshift(position)
    }
  } else {
    for (let cursor = scanCursorIndex + 1; cursor < positionList.length; cursor++) {
      const position = positionList[cursor]
      if (!position || position.rowNo === currentRowNo) continue
      if (probablePosition[0] && probablePosition[0].rowNo !== position.rowNo) {
        break
      }
      probablePosition.push(position)
    }
  }

  if (
    direction === 'down' &&
    probablePosition.length &&
    probablePosition[0].pageNo > currentPosition.pageNo
  ) {
    const nextPageStartIndex = probablePosition[0].index
    return nextPageStartIndex === scanCursorIndex + 1
      ? nextPageStartIndex
      : Math.max(0, nextPageStartIndex - 1)
  }

  let nextIndex: number | null = null
  for (let index = 0; index < probablePosition.length; index++) {
    const nextPosition = probablePosition[index]
    const {
      coordinate: {
        leftTop: [nextLeftX],
        rightTop: [nextRightX]
      }
    } = nextPosition
    if (index === probablePosition.length - 1) {
      nextIndex = nextPosition.index
    }
    if (cursorX < nextLeftX || cursorX > nextRightX) {
      continue
    }
    nextIndex = nextPosition.index
    break
  }

  return nextIndex
}

export function resolvePreviousPageIndexWithinCurrentCell(payload: {
  positionList: IElementPosition[]
  cursorIndex: number
}): number | null {
  const { positionList, cursorIndex } = payload
  const currentPosition = positionList[cursorIndex]
  if (!currentPosition) {
    return null
  }

  const currentPageNo = currentPosition.pageNo
  const cursorX = currentPosition.coordinate.leftTop[0]
  const previousPagePositions = positionList.filter(
    position => position.pageNo < currentPageNo
  )
  if (!previousPagePositions.length) {
    return null
  }

  const targetPageNo = previousPagePositions[previousPagePositions.length - 1].pageNo
  const targetPagePositions = previousPagePositions.filter(
    position => position.pageNo === targetPageNo
  )
  if (!targetPagePositions.length) {
    return null
  }

  const lastRowNo = targetPagePositions[targetPagePositions.length - 1].rowNo
  const lastRowPositions = targetPagePositions.filter(
    position => position.rowNo === lastRowNo
  )
  if (!lastRowPositions.length) {
    return null
  }

  let nextIndex = lastRowPositions[lastRowPositions.length - 1].index
  for (let index = 0; index < lastRowPositions.length; index++) {
    const nextPosition = lastRowPositions[index]
    const {
      coordinate: {
        leftTop: [nextLeftX],
        rightTop: [nextRightX]
      }
    } = nextPosition
    if (cursorX < nextLeftX || cursorX > nextRightX) {
      continue
    }
    nextIndex = nextPosition.index
    break
  }

  return nextIndex
}

export function resolveHorizontalSiblingCell(payload: {
  trList: Array<{ tdList: Array<unknown> }>
  trIndex: number
  tdIndex: number
  direction: 'prev' | 'next'
}): { trIndex: number; tdIndex: number } | null {
  const { trList, trIndex, tdIndex, direction } = payload
  if (direction === 'prev') {
    let nextTrIndex = trIndex
    let nextTdIndex = tdIndex - 1
    if (nextTdIndex < 0) {
      nextTrIndex = trIndex - 1
      nextTdIndex = (trList[nextTrIndex]?.tdList.length ?? 1) - 1
    }
    return nextTrIndex >= 0 && nextTdIndex >= 0
      ? { trIndex: nextTrIndex, tdIndex: nextTdIndex }
      : null
  }

  let nextTrIndex = trIndex
  let nextTdIndex = tdIndex + 1
  if (nextTdIndex > (trList[nextTrIndex]?.tdList.length ?? 0) - 1) {
    nextTrIndex = trIndex + 1
    nextTdIndex = 0
  }
  return nextTrIndex < trList.length &&
    nextTdIndex < (trList[nextTrIndex]?.tdList.length ?? 0)
    ? { trIndex: nextTrIndex, tdIndex: nextTdIndex }
    : null
}

export function resolveVerticalSiblingCell(payload: {
  trList: Array<{
    tdList: Array<{
      colIndex?: number
      colspan: number
    }>
  }>
  trIndex: number
  tdIndex: number
  direction: 'up' | 'down'
}): { trIndex: number; tdIndex: number } | null {
  const { trList, trIndex, tdIndex, direction } = payload
  const currentTd = trList?.[trIndex]?.tdList?.[tdIndex]
  const currentColIndex = currentTd?.colIndex
  if (!trList?.length || currentColIndex === undefined) {
    return null
  }

  const step = direction === 'down' ? 1 : -1
  for (
    let nextTrIndex = trIndex + step;
    nextTrIndex >= 0 && nextTrIndex < trList.length;
    nextTrIndex += step
  ) {
    const tdList = trList[nextTrIndex].tdList || []
    for (let nextTdIndex = 0; nextTdIndex < tdList.length; nextTdIndex++) {
      const td = tdList[nextTdIndex]
      if (
        td.colIndex === currentColIndex ||
        (td.colIndex !== undefined &&
          td.colIndex + td.colspan - 1 >= currentColIndex &&
          td.colIndex <= currentColIndex)
      ) {
        return { trIndex: nextTrIndex, tdIndex: nextTdIndex }
      }
    }
  }

  return null
}
