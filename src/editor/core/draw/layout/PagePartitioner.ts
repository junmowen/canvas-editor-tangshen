import { PageMode } from '../../../dataset/enum/Editor'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { shouldFragmentTableRow } from '../../modules/table/layout/TableRowLayoutPolicy'
import type { Draw } from '../Draw'

export interface IPagePartitionResult {
  /** 页面行列表，保存当前页排版后的行信息。 */
  pageRowList: IRow[][]
  mainElementList: IElement[]
  /** 布局元素列表，保存参与本轮排版的元素序列。 */
  layoutElementList: IElement[]
  /** 连页模式下所有行合并后的页面高度。 */
  continuousPageHeight?: number
}

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
    const marginHeight = this.draw.getMainOuterHeight()
    const pageContentHeight = height - marginHeight
    let pageHeight = marginHeight
    let pageNo = 0
    let isPageLimitReached = false

    if (pageMode === PageMode.CONTINUITY) {
      pageRowList[0] = rowList
      pageHeight += rowList.reduce(
        (pre, cur) => pre + cur.height + (cur.offsetY || 0),
        0
      )
      return {
        pageRowList,
        mainElementList,
        layoutElementList: rowList.flatMap(row => row.elementList),
        continuousPageHeight: pageHeight
      }
    }

    for (let i = 0; i < rowList.length; i++) {
      if (isPageLimitReached) {
        break
      }
      const row = rowList[i]
      const rowOffsetY = row.offsetY || 0
      if (shouldFragmentTableRow({
        row,
        rowOffsetY,
        pageHeight,
        pageLimitHeight: height
      })) {
        const { startOnNewPage, rows: fragmentRows } =
          this.draw.getServices().rowLayoutEngine.getTableLayoutEngine().createFragmentRows({
            row,
            availableHeight: height - pageHeight - rowOffsetY,
            pageContentHeight
          })

        if ((startOnNewPage || rowList[i - 1]?.isPageBreak) && pageRowList[pageNo].length) {
          if (Number.isInteger(maxPageNo) && pageNo >= maxPageNo!) {
            isPageLimitReached = true
            break
          }
          pageNo++
          pageRowList[pageNo] = []
          pageHeight = marginHeight
        }

        for (let f = 0; f < fragmentRows.length; f++) {
          const fragmentRow = fragmentRows[f]
          const fragmentOffsetY = fragmentRow.offsetY || 0

          if (
            fragmentRow.height + fragmentOffsetY + pageHeight > height &&
            pageRowList[pageNo].length
          ) {
            if (Number.isInteger(maxPageNo) && pageNo >= maxPageNo!) {
              isPageLimitReached = true
              break
            }
            pageNo++
            pageRowList[pageNo] = []
            pageHeight = marginHeight
          }

          if (!pageRowList[pageNo]) {
            pageRowList[pageNo] = []
          }
          pageHeight += fragmentRow.height + fragmentOffsetY
          pageRowList[pageNo].push(fragmentRow)

        }
        continue
      }

      if (row.height + rowOffsetY + pageHeight > height || rowList[i - 1]?.isPageBreak) {
        if (Number.isInteger(maxPageNo) && pageNo >= maxPageNo!) {
          break
        }
        pageHeight = marginHeight + row.height + rowOffsetY
        pageRowList.push([row])
        pageNo++
      } else {
        pageHeight += row.height + rowOffsetY
        pageRowList[pageNo].push(row)
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
}
