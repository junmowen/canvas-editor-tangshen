import { IPageColumns } from '../../../interface/PageColumns'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'

/** 获取行所属段落的局部分栏配置。 */
export function getRowColumns(row?: IRow): IPageColumns | undefined {
  return row?.elementList.find(element => element.columns)?.columns
}

/** 克隆分栏配置，避免行布局产物被后续命令误改。 */
export function cloneColumns(columns?: IPageColumns): IPageColumns | undefined {
  if (!columns) return undefined
  return {
    ...columns,
    widths: columns.widths ? columns.widths.slice() : undefined
  }
}

/** 生成分栏配置比较键，用于判断是否进入新的选区分栏小节。 */
export function getColumnsKey(columns?: IPageColumns): string {
  if (!columns) return 'global'
  return JSON.stringify({
    count: columns.count,
    gap: columns.gap,
    widths: columns.widths || []
  })
}

/** 读取当前分栏配置的栏数量。 */
export function getColumnCount(payload: {
  /** Draw 门面，用于读取分栏布局服务。 */
  draw: Draw
  /** 当前页码。 */
  pageNo: number
  /** 当前分栏配置。 */
  columns?: IPageColumns
}): number {
  const { draw, pageNo, columns } = payload
  return draw
    .getServices()
    .pageColumnLayoutService.getPageColumnLayout(pageNo, columns).columnList.length
}

/** 把分栏小节的高度游标换算为页面坐标。 */
export function getColumnStartY(payload: {
  /** Draw 门面，用于读取分栏布局服务。 */
  draw: Draw
  /** 当前页码。 */
  pageNo: number
  /** 当前分栏小节起始高度。 */
  sectionStartHeight: number
  /** 当前页正文外部基础占高。 */
  marginHeight: number
}): number | undefined {
  const { draw, pageNo, sectionStartHeight, marginHeight } = payload
  if (sectionStartHeight === marginHeight) {
    return undefined
  }
  const contentRect = draw
    .getServices()
    .pageColumnLayoutService.getPageColumnLayout(pageNo).contentRect
  return contentRect.y + sectionStartHeight - marginHeight
}
