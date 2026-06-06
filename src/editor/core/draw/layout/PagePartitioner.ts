import { PageMode } from '../../../dataset/enum/Editor'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { shouldFragmentTableRow } from '../../modules/table/layout/TableRowLayoutPolicy'
import type { Draw } from '../Draw'
import {
  shouldBreakForKeepLines,
  shouldBreakForKeepWithNext,
  shouldBreakForWidowControl
} from './PagePartitionKeepPolicy'
import {
  getColumnsKey,
  getRowColumns
} from './PagePartitionColumnPolicy'
import { PagePartitionCursor } from './PagePartitionCursor'
import { placeBalancedLocalColumnSection } from './PagePartitionLocalColumnBalancer'

export interface IPagePartitionResult {
  /** 页面行列表，保存当前页排版后的行信息。 */
  pageRowList: IRow[][]
  mainElementList: IElement[]
  /** 布局元素列表，保存参与本轮排版的元素序列。 */
  layoutElementList: IElement[]
  /** 连页模式下所有行合并后的页面高度。 */
  continuousPageHeight?: number
}

/** 分页/分栏拆分器，负责把行列表放入页和栏。 */
export class PagePartitioner {
  /** 初始化 PagePartitioner 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 按分页模式把排版行拆分到各页，并返回实际参与布局的元素序列。 */
  public partitionRows(rowList: IRow[], mainElementList: IElement[]): IPagePartitionResult {
    const pageRowList: IRow[][] = [[]]
    const {
      pageMode,
      pageNumber: { maxPageNo }
    } = this.draw.getOptions()
    const height = this.draw.getHeight()
    const cursor = new PagePartitionCursor(
      this.draw,
      pageRowList,
      maxPageNo,
      getRowColumns(rowList[0])
    )

    if (pageMode === PageMode.CONTINUITY) {
      pageRowList[0] = rowList.map(row => ({
        ...row,
        columnIndex: 0
      }))
      cursor.pageHeight += rowList.reduce(
        (pre, cur) => pre + cur.height + (cur.offsetY || 0),
        0
      )
      return {
        pageRowList,
        mainElementList,
        layoutElementList: pageRowList[0].flatMap(row => row.elementList),
        continuousPageHeight: cursor.pageHeight
      }
    }

    for (let i = 0; i < rowList.length; i++) {
      if (cursor.isPageLimitReached) {
        break
      }
      const row = rowList[i]
      const rowColumns = getRowColumns(row)
      const rowColumnsKey = getColumnsKey(rowColumns)
      if (rowColumnsKey !== cursor.currentColumnsKey) {
        cursor.closeCurrentSection()
        cursor.resetColumnSection(rowColumns)
      }
      if (rowColumns) {
        i = placeBalancedLocalColumnSection({
          rowList,
          startIndex: i,
          height,
          cursor
        })
        continue
      }
      const rowOffsetY = row.offsetY || 0
      const columnLayout = this.draw
        .getServices()
        .pageColumnLayoutService.getPageColumnLayout(
          cursor.pageNo,
          cursor.currentColumns
        )
      const columnCount = columnLayout.columnList.length
      const isBreakBeforeRow =
        this.shouldBreakBeforeRow(row, mainElementList) &&
        pageRowList[cursor.pageNo].length > 0
      const isKeepWithNextBreak =
        shouldBreakForKeepWithNext({
          row,
          nextRow: rowList[i + 1],
          pageHeight: cursor.pageHeight,
          pageLimitHeight: height,
          pageRows: pageRowList[cursor.pageNo],
          columnIndex: cursor.columnIndex
        })
      const isKeepLinesBreak =
        shouldBreakForKeepLines({
          rowList,
          rowIndex: i,
          pageHeight: cursor.pageHeight,
          pageBaseHeight: cursor.marginHeight,
          pageLimitHeight: height,
          pageRows: pageRowList[cursor.pageNo],
          columnIndex: cursor.columnIndex
        })
      const isWidowControlBreak =
        shouldBreakForWidowControl({
          rowList,
          rowIndex: i,
          pageHeight: cursor.pageHeight,
          pageBaseHeight: cursor.marginHeight,
          pageLimitHeight: height,
          pageRows: pageRowList[cursor.pageNo],
          columnIndex: cursor.columnIndex
        })
      if (shouldFragmentTableRow({
        row,
        rowOffsetY,
        pageHeight: cursor.pageHeight,
        pageLimitHeight: height
      })) {
        const { startOnNewPage, rows: fragmentRows } =
          this.draw.getServices().rowLayoutEngine.getTableLayoutEngine().createFragmentRows({
            row,
            availableHeight: height - cursor.pageHeight - rowOffsetY,
            pageContentHeight: cursor.pageContentHeight
          })

        if (
          (startOnNewPage || rowList[i - 1]?.isPageBreak || isBreakBeforeRow) &&
          pageRowList[cursor.pageNo].length
        ) {
          // 表格自然溢出可以进入下一栏，显式分页规则必须进入下一页。
          if (
            cursor.columnIndex < columnCount - 1 &&
            !startOnNewPage &&
            !rowList[i - 1]?.isPageBreak &&
            !isBreakBeforeRow
          ) {
            cursor.advanceToNextColumn()
          } else {
            if (!cursor.advanceToNextPage()) {
              break
            }
          }
        }

        for (let f = 0; f < fragmentRows.length; f++) {
          const fragmentRow = fragmentRows[f]
          const fragmentOffsetY = fragmentRow.offsetY || 0

          if (
            fragmentRow.height + fragmentOffsetY + cursor.pageHeight > height &&
            pageRowList[cursor.pageNo].length
          ) {
            // 表格 fragment 溢出时优先进入下一栏，最后一栏才进入下一页。
            if (cursor.columnIndex < columnCount - 1) {
              cursor.advanceToNextColumn()
            } else {
              if (!cursor.advanceToNextPage()) {
                break
              }
            }
          }

          cursor.pushPlacedRow(fragmentRow)
        }
        continue
      }

      if (
        row.height + rowOffsetY + cursor.pageHeight > height ||
        rowList[i - 1]?.isPageBreak ||
        isBreakBeforeRow ||
        isKeepWithNextBreak ||
        isKeepLinesBreak ||
        isWidowControlBreak
      ) {
        // 普通行自然溢出进入下一栏；手动分页和段前分页仍进入下一页。
        if (
          cursor.columnIndex < columnCount - 1 &&
          !rowList[i - 1]?.isPageBreak &&
          !isBreakBeforeRow
        ) {
          cursor.advanceToNextColumn()
        } else {
          if (!cursor.advanceToNextPage()) {
            break
          }
        }
        cursor.pushPlacedRow(row)
      } else {
        cursor.pushPlacedRow(row)
      }
    }

    const filteredPageRowList = pageRowList
      .filter(pageRows => pageRows.length)
      .map(pageRows => pageRows.filter((row): row is IRow => !!row))

    return {
      pageRowList: filteredPageRowList,
      mainElementList,
      layoutElementList: filteredPageRowList.flatMap(pageRows =>
        pageRows.flatMap(row => row.elementList)
      )
    }
  }

  /** 判断当前行是否声明段前分页。 */
  private shouldBreakBeforeRow(row: IRow, mainElementList: IElement[]): boolean {
    if (!row.elementList.some(element => element.pageBreakBefore)) {
      return false
    }
    const previousElement = mainElementList[row.startIndex - 1]
    return !previousElement?.pageBreakBefore
  }

}
