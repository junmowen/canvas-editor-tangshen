import { ElementType } from '../../../dataset/enum/Element'
import { PageMode } from '../../../dataset/enum/Editor'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'

export interface IPagePartitionResult {
  pageRowList: IRow[][]
  mainElementList: IElement[]
  layoutElementList: IElement[]
  continuousPageHeight?: number
}

export class PagePartitioner {
  constructor(private readonly draw: Draw) {}

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
    let nextMainElementList = mainElementList

    if (pageMode === PageMode.CONTINUITY) {
      pageRowList[0] = rowList
      pageHeight += rowList.reduce(
        (pre, cur) => pre + cur.height + (cur.offsetY || 0),
        0
      )
      return {
        pageRowList,
        mainElementList: nextMainElementList,
        layoutElementList: rowList.flatMap(row => row.elementList),
        continuousPageHeight: pageHeight
      }
    }

    for (let i = 0; i < rowList.length; i++) {
      const row = rowList[i]
      const rowOffsetY = row.offsetY || 0
      const rowTableElement = row.elementList[0] as IElement | undefined
      const isTableRow =
        row.elementList.length === 1 && rowTableElement?.type === ElementType.TABLE
      const hasInlineTable = row.elementList.some(
        element => element.type === ElementType.TABLE && element.tableDisplay === 'inline'
      )
      const shouldFragmentTableRow =
        isTableRow ||
        (hasInlineTable && row.height + rowOffsetY + pageHeight > height)

      if (shouldFragmentTableRow) {
        const { startOnNewPage, rows: fragmentRows } =
          this.draw.getServices().rowLayoutEngine.getTableLayoutEngine().createFragmentRows({
            row,
            availableHeight: height - pageHeight - rowOffsetY,
            pageContentHeight
          })

        if ((startOnNewPage || rowList[i - 1]?.isPageBreak) && pageRowList[pageNo].length) {
          if (Number.isInteger(maxPageNo) && pageNo >= maxPageNo!) {
            nextMainElementList = nextMainElementList.slice(0, row.startIndex)
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
              nextMainElementList = nextMainElementList.slice(0, row.startIndex)
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
          nextMainElementList = nextMainElementList.slice(0, row.startIndex)
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
      mainElementList: nextMainElementList,
      layoutElementList: filteredPageRowList.flatMap(pageRows =>
        pageRows.flatMap(row => row.elementList)
      )
    }
  }
}
