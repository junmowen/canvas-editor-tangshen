import { ZERO } from '../../../dataset/constant/Common'
import { IRow } from '../../../interface/Row'

function isParagraphStart(rowList: IRow[], rowIndex: number): boolean {
  const row = rowList[rowIndex]
  if (!row) return false
  return rowIndex === 0 || row.elementList[0]?.value === ZERO
}

function hasKeepLines(paragraphRows: IRow[]): boolean {
  return paragraphRows.some(row =>
    row.elementList.some(element => element.keepLines)
  )
}

function hasWidowControl(paragraphRows: IRow[]): boolean {
  return paragraphRows.some(row =>
    row.elementList.some(element => element.widowControl)
  )
}

function getParagraphStartIndex(rowList: IRow[], rowIndex: number): number {
  let startIndex = rowIndex
  while (startIndex > 0 && !isParagraphStart(rowList, startIndex)) {
    startIndex--
  }
  return startIndex
}

export function getPartitionParagraphRows(
  rowList: IRow[],
  startRowIndex: number
): IRow[] {
  const paragraphRows: IRow[] = []
  for (let index = startRowIndex; index < rowList.length; index++) {
    if (index > startRowIndex && isParagraphStart(rowList, index)) {
      break
    }
    paragraphRows.push(rowList[index])
  }
  return paragraphRows
}

export function getRowsHeight(rowList: IRow[]): number {
  return rowList.reduce(
    (total, row) => total + row.height + (row.offsetY || 0),
    0
  )
}

function getCurrentColumnRows(payload: {
  pageRows: IRow[]
  columnIndex: number
}) {
  const { pageRows, columnIndex } = payload
  return pageRows.filter(pageRow => (pageRow.columnIndex || 0) === columnIndex)
}

export function shouldBreakForKeepWithNext(payload: {
  row: IRow
  nextRow?: IRow
  pageHeight: number
  pageLimitHeight: number
  pageRows: IRow[]
  columnIndex: number
}): boolean {
  const {
    row,
    nextRow,
    pageHeight,
    pageLimitHeight,
    pageRows,
    columnIndex
  } = payload
  if (!nextRow || !row.elementList.some(element => element.keepWithNext)) {
    return false
  }
  const currentColumnRows = getCurrentColumnRows({ pageRows, columnIndex })
  if (!currentColumnRows.length) return false
  const rowHeight = row.height + (row.offsetY || 0)
  const nextRowHeight = nextRow.height + (nextRow.offsetY || 0)
  return (
    pageHeight + rowHeight <= pageLimitHeight &&
    pageHeight + rowHeight + nextRowHeight > pageLimitHeight
  )
}

export function shouldBreakForKeepLines(payload: {
  rowList: IRow[]
  rowIndex: number
  pageHeight: number
  pageBaseHeight: number
  pageLimitHeight: number
  pageRows: IRow[]
  columnIndex: number
}): boolean {
  const {
    rowList,
    rowIndex,
    pageHeight,
    pageBaseHeight,
    pageLimitHeight,
    pageRows,
    columnIndex
  } = payload
  if (!isParagraphStart(rowList, rowIndex)) return false
  const paragraphRows = getPartitionParagraphRows(rowList, rowIndex)
  if (!paragraphRows.length || !hasKeepLines(paragraphRows)) return false
  const currentColumnRows = getCurrentColumnRows({ pageRows, columnIndex })
  if (!currentColumnRows.length) return false
  const paragraphHeight = getRowsHeight(paragraphRows)
  const columnContentHeight = pageLimitHeight - pageBaseHeight
  if (paragraphHeight > columnContentHeight) return false
  return pageHeight + paragraphHeight > pageLimitHeight
}

export function shouldBreakForWidowControl(payload: {
  rowList: IRow[]
  rowIndex: number
  pageHeight: number
  pageBaseHeight: number
  pageLimitHeight: number
  pageRows: IRow[]
  columnIndex: number
}): boolean {
  const {
    rowList,
    rowIndex,
    pageHeight,
    pageBaseHeight,
    pageLimitHeight,
    pageRows,
    columnIndex
  } = payload
  const paragraphStartIndex = getParagraphStartIndex(rowList, rowIndex)
  const paragraphRows = getPartitionParagraphRows(rowList, paragraphStartIndex)
  if (paragraphRows.length < 2 || !hasWidowControl(paragraphRows)) {
    return false
  }
  const currentColumnRows = getCurrentColumnRows({ pageRows, columnIndex })
  if (!currentColumnRows.length) return false
  const columnContentHeight = pageLimitHeight - pageBaseHeight
  const paragraphRowOffset = rowIndex - paragraphStartIndex

  if (paragraphRowOffset === 0) {
    const firstTwoRows = paragraphRows.slice(0, 2)
    const firstTwoHeight = getRowsHeight(firstTwoRows)
    return (
      firstTwoHeight <= columnContentHeight &&
      pageHeight + firstTwoHeight > pageLimitHeight
    )
  }

  if (paragraphRowOffset === paragraphRows.length - 2) {
    const previousParagraphRows = paragraphRows.slice(0, paragraphRowOffset)
    const previousStartIndexSet = new Set(
      previousParagraphRows.map(row => row.startIndex)
    )
    const hasPreviousParagraphRowInColumn = currentColumnRows.some(row =>
      previousStartIndexSet.has(row.startIndex)
    )
    if (!hasPreviousParagraphRowInColumn) return false
    const lastTwoRows = paragraphRows.slice(paragraphRowOffset)
    const lastTwoHeight = getRowsHeight(lastTwoRows)
    return (
      lastTwoHeight <= columnContentHeight &&
      pageHeight + lastTwoHeight > pageLimitHeight
    )
  }

  return false
}
