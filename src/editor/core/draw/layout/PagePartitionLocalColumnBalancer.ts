import { IRow } from '../../../interface/Row'
import {
  getColumnsKey,
  getRowColumns
} from './PagePartitionColumnPolicy'
import { PagePartitionCursor } from './PagePartitionCursor'
import { getRowsHeight } from './PagePartitionKeepPolicy'

/** 收集同一段落级分栏配置下的连续行，作为一个选中内容分栏小节。 */
function collectLocalColumnSectionRows(rowList: IRow[], startIndex: number) {
  const sectionRows: IRow[] = []
  const sectionKey = getColumnsKey(getRowColumns(rowList[startIndex]))
  for (let index = startIndex; index < rowList.length; index++) {
    const nextRow = rowList[index]
    if (getColumnsKey(getRowColumns(nextRow)) !== sectionKey) {
      break
    }
    sectionRows.push(nextRow)
  }
  return sectionRows
}

/** 获取局部分栏剩余行中最高行高度，避免目标栏高小于单行高度导致抖动。 */
function getMaxRowHeight(rows: IRow[]) {
  return rows.reduce(
    (maxHeight, row) => Math.max(maxHeight, row.height + (row.offsetY || 0)),
    0
  )
}

function getAtomicKeepLinesParagraphRows(payload: {
  sectionRows: IRow[]
  startRowIndex: number
  currentAvailableHeight: number
}) {
  const { sectionRows, startRowIndex, currentAvailableHeight } = payload
  const isKeepLinesRow = (row: IRow) =>
    row.elementList.some(element => element.keepLines)
  const previousRow = sectionRows[startRowIndex - 1]
  if (
    !isKeepLinesRow(sectionRows[startRowIndex]) ||
    (previousRow && isKeepLinesRow(previousRow))
  ) {
    return null
  }
  const paragraphRows: IRow[] = []
  for (let index = startRowIndex; index < sectionRows.length; index++) {
    const paragraphRow = sectionRows[index]
    if (!isKeepLinesRow(paragraphRow)) {
      break
    }
    paragraphRows.push(paragraphRow)
  }
  const paragraphHeight = getRowsHeight(paragraphRows)
  if (paragraphHeight > currentAvailableHeight) {
    return null
  }
  return {
    height: paragraphHeight,
    rowList: paragraphRows
  }
}

/** 选中内容分栏按小节总高度均衡分配，内容超过一页时按栏满后续页继续承接。 */
export function placeBalancedLocalColumnSection(payload: {
  rowList: IRow[]
  startIndex: number
  height: number
  cursor: PagePartitionCursor
}) {
  const { rowList, startIndex, height, cursor } = payload
  const sectionRows = collectLocalColumnSectionRows(rowList, startIndex)
  const fullAvailableHeight = height - cursor.marginHeight

  let rowIndex = 0
  while (rowIndex < sectionRows.length && !cursor.isPageLimitReached) {
    const remainingRows = sectionRows.slice(rowIndex)
    const remainingHeight = getRowsHeight(remainingRows)
    const currentAvailableHeight = height - cursor.sectionStartHeight
    const currentPageCapacity =
      currentAvailableHeight * cursor.currentColumnCount
    const desiredColumnHeight = Math.max(
      getMaxRowHeight(remainingRows),
      Math.ceil(remainingHeight / Math.max(1, cursor.currentColumnCount))
    )

    // 当前页剩余高度不足以均衡承接整段，但新页可以承接时，先整体换页。
    if (
      rowIndex === 0 &&
      cursor.pageRowList[cursor.pageNo].length &&
      desiredColumnHeight > currentAvailableHeight &&
      desiredColumnHeight <= fullAvailableHeight
    ) {
      if (!cursor.advanceToNextPage()) {
        break
      }
      continue
    }

    const targetColumnHeight =
      remainingHeight <= currentPageCapacity
        ? Math.min(desiredColumnHeight, currentAvailableHeight)
        : currentAvailableHeight

    while (rowIndex < sectionRows.length && !cursor.isPageLimitReached) {
      const atomicKeepLinesParagraph = getAtomicKeepLinesParagraphRows({
        sectionRows,
        startRowIndex: rowIndex,
        currentAvailableHeight
      })
      if (atomicKeepLinesParagraph) {
        const currentColumnContentHeight =
          cursor.pageHeight - cursor.sectionStartHeight
        if (
          currentColumnContentHeight > 0 &&
          currentColumnContentHeight + atomicKeepLinesParagraph.height >
            targetColumnHeight
        ) {
          if (!cursor.advanceLocalColumnOrPage()) {
            break
          }
          if (cursor.columnIndex === 0) {
            break
          }
          continue
        }
        atomicKeepLinesParagraph.rowList.forEach(paragraphRow => {
          cursor.pushPlacedRow(paragraphRow)
        })
        rowIndex += atomicKeepLinesParagraph.rowList.length

        const remainingRowCount = sectionRows.length - rowIndex
        const placedColumnContentHeight =
          cursor.sectionColumnHeights[cursor.columnIndex] -
          cursor.sectionStartHeight
        if (
          remainingRowCount > 0 &&
          placedColumnContentHeight >= targetColumnHeight
        ) {
          if (!cursor.advanceLocalColumnOrPage()) {
            break
          }
          if (cursor.columnIndex === 0) {
            break
          }
        }
        continue
      }

      const sectionRow = sectionRows[rowIndex]
      const sectionRowHeight = sectionRow.height + (sectionRow.offsetY || 0)
      const currentColumnContentHeight =
        cursor.pageHeight - cursor.sectionStartHeight
      const shouldMoveBeforeRow =
        currentColumnContentHeight > 0 &&
        currentColumnContentHeight + sectionRowHeight > targetColumnHeight &&
        sectionRowHeight <= currentAvailableHeight

      if (shouldMoveBeforeRow) {
        if (!cursor.advanceLocalColumnOrPage()) {
          break
        }
        // 换页后剩余容量改变，需要重新计算当前页目标栏高。
        if (cursor.columnIndex === 0) {
          break
        }
        continue
      }

      cursor.pushPlacedRow(sectionRow)
      rowIndex++

      const remainingRowCount = sectionRows.length - rowIndex
      const placedColumnContentHeight =
        cursor.sectionColumnHeights[cursor.columnIndex] -
        cursor.sectionStartHeight
      // 前 N-1 栏达到目标高度后切到下一栏；最后一栏已满且还有内容时进入下一页。
      if (
        remainingRowCount > 0 &&
        placedColumnContentHeight >= targetColumnHeight
      ) {
        if (!cursor.advanceLocalColumnOrPage()) {
          break
        }
        if (cursor.columnIndex === 0) {
          break
        }
      }
    }
  }
  cursor.closeCurrentSection()
  return startIndex + sectionRows.length - 1
}
