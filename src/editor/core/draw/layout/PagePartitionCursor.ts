import { IPageColumns } from '../../../interface/PageColumns'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'
import {
  cloneColumns,
  getColumnCount,
  getColumnStartY,
  getColumnsKey
} from './PagePartitionColumnPolicy'

/** 分页/分栏游标，集中维护当前页、当前栏和当前分栏小节的高度状态。 */
export class PagePartitionCursor {
  public marginHeight: number
  public pageContentHeight: number
  public pageHeight: number
  public pageNo = 0
  public columnIndex = 0
  public isPageLimitReached = false
  public currentColumns?: IPageColumns
  public currentColumnsKey: string
  public currentColumnCount: number
  public sectionStartHeight: number
  public sectionColumnHeights: number[]

  public constructor(
    private readonly draw: Draw,
    public readonly pageRowList: IRow[][],
    private readonly maxPageNo: number | null | undefined,
    initialColumns?: IPageColumns
  ) {
    this.marginHeight = this.getPageBaseHeight(0)
    this.pageContentHeight = this.getPageContentHeight(0)
    this.pageHeight = this.marginHeight
    this.currentColumns = initialColumns
    this.currentColumnsKey = getColumnsKey(initialColumns)
    this.currentColumnCount = this.getColumnCount(initialColumns)
    this.sectionStartHeight = this.marginHeight
    this.sectionColumnHeights = Array(this.currentColumnCount).fill(
      this.sectionStartHeight
    )
  }

  /** 进入新的分栏小节，选中内容分栏与前后正文互不抢占纵向游标。 */
  public resetColumnSection(nextColumns?: IPageColumns) {
    this.currentColumns = nextColumns
    this.currentColumnsKey = getColumnsKey(nextColumns)
    this.currentColumnCount = this.getColumnCount(this.currentColumns)
    this.columnIndex = 0
    this.sectionStartHeight = this.pageHeight
    this.sectionColumnHeights = Array(this.currentColumnCount).fill(
      this.sectionStartHeight
    )
  }

  /** 换页后当前分栏小节从新页面正文顶部重新开始。 */
  public resetSectionOnNewPage() {
    this.marginHeight = this.getPageBaseHeight(this.pageNo)
    this.pageContentHeight = this.getPageContentHeight(this.pageNo)
    this.currentColumnCount = this.getColumnCount(this.currentColumns)
    this.columnIndex = 0
    this.sectionStartHeight = this.marginHeight
    this.sectionColumnHeights = Array(this.currentColumnCount).fill(
      this.sectionStartHeight
    )
    this.pageHeight = this.marginHeight
  }

  /** 当前分栏小节结束时，把后续正文放在本小节最深的栏之后。 */
  public closeCurrentSection() {
    this.pageHeight = Math.max(this.pageHeight, ...this.sectionColumnHeights)
  }

  /** 记录行的最终栏上下文，供 position 和排版快照消费。 */
  public createPlacedRow(row: IRow): IRow {
    return {
      ...row,
      columnIndex: this.columnIndex,
      columns: cloneColumns(this.currentColumns),
      columnStartY: getColumnStartY({
        draw: this.draw,
        pageNo: this.pageNo,
        sectionStartHeight: this.sectionStartHeight,
        marginHeight: this.marginHeight
      })
    }
  }

  /** 更新当前栏高度，并保留同一分栏小节内各栏的最大占用。 */
  public pushPlacedRow(row: IRow) {
    this.pageHeight += row.height + (row.offsetY || 0)
    this.sectionColumnHeights[this.columnIndex] = this.pageHeight
    if (!this.pageRowList[this.pageNo]) {
      this.pageRowList[this.pageNo] = []
    }
    this.pageRowList[this.pageNo].push(this.createPlacedRow(row))
  }

  /** 切到当前分栏小节的下一栏。 */
  public advanceToNextColumn() {
    this.columnIndex++
    this.pageHeight = this.sectionStartHeight
  }

  /** 切到下一页；到达最大页数时返回 false。 */
  public advanceToNextPage() {
    if (Number.isInteger(this.maxPageNo) && this.pageNo >= this.maxPageNo!) {
      this.isPageLimitReached = true
      return false
    }
    this.pageNo++
    this.pageRowList[this.pageNo] = []
    this.resetSectionOnNewPage()
    return true
  }

  /** 局部分栏放置时优先进入下一栏，最后一栏满后进入下一页。 */
  public advanceLocalColumnOrPage() {
    if (this.columnIndex < this.currentColumnCount - 1) {
      this.advanceToNextColumn()
      return true
    }
    return this.advanceToNextPage()
  }

  private getPageBaseHeight(pageNo: number): number {
    return this.draw.getMainOuterHeight(pageNo)
  }

  private getPageContentHeight(pageNo: number): number {
    return this.draw.getHeight() - this.getPageBaseHeight(pageNo)
  }

  private getColumnCount(columns?: IPageColumns): number {
    return getColumnCount({
      draw: this.draw,
      pageNo: this.pageNo,
      columns
    })
  }
}
