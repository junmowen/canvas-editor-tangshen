import { IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'

// 逻辑 cell / fragment cell / page 维度下的 key，
// 用于把快照查询统一压成 Map 读取。
export type TLogicalTableCellKey = string
export type TFragmentTableCellKey = string
export type TCellFragmentAliasKey = string
export type TCellPageKey = string

/** 逻辑表格单元格唯一键。 */
export function getTableLayoutLogicalCellKey(
  tableId: string,
  trId: string,
  tdId: string
): TLogicalTableCellKey {
  return `${tableId}_${trId}_${tdId}`
}

/** fragment 单元格唯一键。 */
export function getTableLayoutFragmentCellKey(
  tableId: string,
  trId: string,
  tdId: string
): TFragmentTableCellKey {
  return `${tableId}_${trId}_${tdId}`
}

/** “逻辑 cell + fragment tr/td” 别名键。 */
export function getTableLayoutCellFragmentAliasKey(
  cellKey: string,
  trId: string,
  tdId: string
): TCellFragmentAliasKey {
  return `${cellKey}_${trId}_${tdId}`
}

/** “逻辑 cell + pageNo” 组合键。 */
export function getTableLayoutCellPageKey(
  cellKey: string,
  pageNo: number
): TCellPageKey {
  return `${cellKey}_${pageNo}`
}

/**
 * 逻辑 cell 在分页后的一个 slice。
 *
 * 同一个逻辑单元格跨页后会拆成多个 slice，
 * hit-test / navigation / render 都围绕 slice 做稳定查询。
 */
export interface ITableLayoutCellSlice {
  cellKey: TLogicalTableCellKey
  fragmentCellKey: TFragmentTableCellKey
  logicalTableId: string
  logicalTableIndex: number
  logicalTrId: string
  logicalTdId: string
  logicalTrIndex: number
  logicalTdIndex: number
  fragmentTableId: string
  fragmentTrId: string
  fragmentTdId: string
  fragmentTrIndex: number
  fragmentTdIndex: number
  pageNo: number
  absoluteStart: number
  absoluteEnd: number
  rowList: IRow[]
  positionList: IElementPosition[]
  firstVisibleOffset: number | null
  rowBands: ITableLayoutSliceRowBand[]
}

/** slice 内部的行带信息，用于把 cell 内字符盒命中缩到局部 row band。 */
export interface ITableLayoutSliceRowBand {
  rowNo: number
  top: number
  bottom: number
  startOffset: number
  endOffset: number
}

/** fragment 单元格在页面上的矩形边界。 */
export interface ITableLayoutFragmentCellBounds {
  fragmentTableId: string
  fragmentTrId: string
  fragmentTdId: string
  pageNo: number
  trIndex: number
  tdIndex: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * 表格布局快照。
 *
 * 当前项目里的 hit-test / navigation / render 都只读这份结构，
 * 不再反复扫描 row / tr / td 动态拼推导。
 */
export interface ITableLayoutSnapshot {
  version: number
  sliceList: ITableLayoutCellSlice[]
  slicesByCellKey: Map<TLogicalTableCellKey, ITableLayoutCellSlice[]>
  sliceStartIndexesByCellKey: Map<TLogicalTableCellKey, number[]>
  slicesByCellPageKey: Map<TCellPageKey, ITableLayoutCellSlice>
  slicesByFragmentCellKey: Map<TFragmentTableCellKey, ITableLayoutCellSlice>
  slicesByLogicalFragmentCellKey: Map<TFragmentTableCellKey, ITableLayoutCellSlice>
  slicesByCellFragmentAliasKey: Map<TCellFragmentAliasKey, ITableLayoutCellSlice>
  slicesByPageNo: Map<number, ITableLayoutCellSlice[]>
  fragmentPositionsByPageNo: Map<number, IElementPosition[]>
  cellBoundsByFragmentTableId: Map<string, ITableLayoutFragmentCellBounds[]>
  logicalTableIdByFragmentTableId: Map<string, string>
  logicalTableIndexByTableId: Map<string, number>
}

export interface IBuildTableLayoutSnapshotRequest {
  version: number
}
