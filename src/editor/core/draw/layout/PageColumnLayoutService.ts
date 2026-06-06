import { ITypesettingColumn, ITypesettingRect } from '../../../interface/TypesettingLayout'
import { IPageColumns } from '../../../interface/PageColumns'
import type { Draw } from '../Draw'

/** 页面栏区计算结果，用于统一正文布局、坐标和快照中的栏信息。 */
export interface IPageColumnLayout {
  /** 页码，从 0 开始。 */
  pageNo: number
  /** 正文内容区域，已经扣除页边距、页眉、页脚和页码占位。 */
  contentRect: ITypesettingRect
  /** 页面栏列表，按从左到右的视觉顺序排列。 */
  columnList: ITypesettingColumn[]
}

/**
 * 页面分栏布局服务。
 *
 * 负责把页面尺寸、页边距和 `options.columns` 解析成稳定栏区。
 * 这是 TS-03 的核心基础能力，正文测量、分页、position 和排版快照都应复用这里的结果。
 */
export class PageColumnLayoutService {
  /** 初始化页面分栏布局服务并持有 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  /** 获取指定页的正文内容区域和栏区域，可传入段落级分栏覆盖页面全局配置。 */
  public getPageColumnLayout(
    pageNo: number,
    columnsOverride?: IPageColumns
  ): IPageColumnLayout {
    const contentRect = this.getContentRect(pageNo)
    return {
      pageNo,
      contentRect,
      columnList: this.createColumnList(pageNo, contentRect, columnsOverride)
    }
  }

  /** 获取指定页的指定栏；栏索引越界时回落到第一栏。 */
  public getColumn(
    pageNo: number,
    columnIndex = 0,
    columnsOverride?: IPageColumns
  ): ITypesettingColumn {
    const layout = this.getPageColumnLayout(pageNo, columnsOverride)
    return layout.columnList[columnIndex] || layout.columnList[0]
  }

  /** 获取当前文档的首栏宽度，供行测量阶段确定换行宽度。 */
  public getPrimaryColumnWidth(pageNo = 0, columnsOverride?: IPageColumns): number {
    return this.getColumn(pageNo, 0, columnsOverride).rect.width
  }

  /** 获取分栏测量宽度，非等宽栏先按最窄栏保守换行，避免后续栏横向溢出。 */
  public getMeasurementColumnWidth(
    pageNo = 0,
    columnsOverride?: IPageColumns
  ): number {
    const columnList = this.getPageColumnLayout(pageNo, columnsOverride)
      .columnList
    const widthList = columnList
      .map(column => column.rect.width)
      .filter(width => width > 0)
    if (!widthList.length) {
      return 0
    }
    return Math.min(...widthList)
  }

  /** 获取当前页的正文内容区域。 */
  private getContentRect(pageNo: number): ITypesettingRect {
    const margins = this.draw.getMargins(pageNo)
    return {
      x: margins[3],
      y: margins[0] + this.draw.getHeader().getExtraHeight(),
      width: this.draw.getWidth() - margins[1] - margins[3],
      height: this.draw.getHeight() - this.draw.getMainOuterHeight(pageNo)
    }
  }

  /** 根据页面分栏配置创建栏区域。 */
  private createColumnList(
    pageNo: number,
    contentRect: ITypesettingRect,
    columnsOverride?: IPageColumns
  ): ITypesettingColumn[] {
    const pageColumns = {
      ...this.draw.getOptions().columns,
      ...columnsOverride
    }
    const { count, gap } = pageColumns
    const widths = pageColumns.widths || []
    const scale = this.draw.getOptions().scale
    const columnCount = Math.max(1, Math.floor(count || 1))
    const columnGap = Math.max(0, gap || 0) * scale
    const totalGap = columnGap * (columnCount - 1)
    const availableWidth = Math.max(0, contentRect.width - totalGap)
    const normalizedWidths = widths
      .slice(0, columnCount)
      .map(width => Math.max(0, width * scale))
    const specifiedWidth = normalizedWidths.reduce((sum, width) => sum + width, 0)
    const defaultColumnWidth =
      columnCount > normalizedWidths.length
        ? Math.max(
            0,
            (availableWidth - specifiedWidth) /
              (columnCount - normalizedWidths.length)
          )
        : 0
    const columnList: ITypesettingColumn[] = []
    let x = contentRect.x

    for (let index = 0; index < columnCount; index++) {
      const width = normalizedWidths[index] ?? defaultColumnWidth
      columnList.push({
        pageNo,
        index,
        rect: {
          x,
          y: contentRect.y,
          width,
          height: contentRect.height
        },
        paragraphBlockList: []
      })
      x += width + columnGap
    }
    return columnList
  }
}
