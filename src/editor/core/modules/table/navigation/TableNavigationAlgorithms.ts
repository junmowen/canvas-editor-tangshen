import { IElementPosition } from '../../../../interface/Element'
import { IPositionContext } from '../../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'

export function createTablePositionContext(payload: {
  /** 切片信息，用于描述表格或元素列表中的局部范围。 */
  slice?: ITableLayoutCellSlice | null
  /** 逻辑表格索引，用于定位原始表格在文档中的位置。 */
  logicalTableIndex?: number
  /** 逻辑行索引，用于定位原始表格中的行。 */
  logicalTrIndex?: number
  /** 逻辑单元格索引，用于定位原始行内的单元格。 */
  logicalTdIndex?: number
  /** 分页片段表格标识，用于关联拆分后的表格片段。 */
  fragmentTableId?: string
  /** 分页片段行标识，用于关联拆分后的表格行片段。 */
  fragmentTrId?: string
  /** 分页片段单元格标识，用于关联拆分后的单元格片段。 */
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

export function resolveVerticalTargetSlice(payload: {
  sliceList: ITableLayoutCellSlice[]
  /** reference页面no，用于定位对应页、行或序号。 */
  referencePageNo?: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
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
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: 'up' | 'down'
  /** 当前位置，用于描述布局或命中的空间范围。 */
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
  // 初始化 probable Position 列表。
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
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
  /** 光标元素索引，用于定位插入点所在元素。 */
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
  /** 表格行列表，保存表格的行结构。 */
  trList: Array<{ tdList: Array<unknown> }>
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
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
  /** 表格行列表，保存表格的行结构。 */
  trList: Array<{
    /** 单元格列表，保存当前行内的单元格结构。 */
    tdList: Array<{
      /** 列索引，用于定位表格中的目标列。 */
      colIndex?: number
      /** 跨列数量，用于描述单元格横向合并范围。 */
      colspan: number
    }>
  }>
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
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
