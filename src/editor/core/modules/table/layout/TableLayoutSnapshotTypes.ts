import { IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'

// 逻辑 cell / fragment cell / page 维度下的 key，
// 用于把快照查询统一压成 Map 读取。
export type TLogicalTableCellKey = string
/** 片段表格单元格key，用于统一生成缓存或映射表中的键名。 */
export type TFragmentTableCellKey = string
/** 单元格片段aliaskey，用于统一生成缓存或映射表中的键名。 */
export type TCellFragmentAliasKey = string
/** 单元格页面key，用于统一生成缓存或映射表中的键名。 */
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
  /** 单元格键名，用于在表格缓存或映射中定位单元格。 */
  cellKey: TLogicalTableCellKey
  /** 片段单元格key，用于在映射表或缓存中定位数据。 */
  fragmentCellKey: TFragmentTableCellKey
  /** 逻辑表格标识，用于把分页片段关联回原始表格。 */
  logicalTableId: string
  /** 逻辑表格索引，用于定位原始表格在文档中的位置。 */
  logicalTableIndex: number
  /** 逻辑行标识，用于把片段行关联回原始表格行。 */
  logicalTrId: string
  /** 逻辑单元格标识，用于把片段单元格关联回原始单元格。 */
  logicalTdId: string
  /** 逻辑行索引，用于定位原始表格中的行。 */
  logicalTrIndex: number
  /** 逻辑单元格索引，用于定位原始行内的单元格。 */
  logicalTdIndex: number
  /** 分页片段表格标识，用于关联拆分后的表格片段。 */
  fragmentTableId: string
  /** 分页片段行标识，用于关联拆分后的表格行片段。 */
  fragmentTrId: string
  /** 分页片段单元格标识，用于关联拆分后的单元格片段。 */
  fragmentTdId: string
  /** 片段tr索引，用于定位对应元素、行或片段。 */
  fragmentTrIndex: number
  /** 片段td索引，用于定位对应元素、行或片段。 */
  fragmentTdIndex: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 文档级起始索引，用于把局部范围换算回完整元素列表。 */
  absoluteStart: number
  /** 文档级结束索引，用于把局部范围换算回完整元素列表。 */
  absoluteEnd: number
  /** 行列表，保存排版后的行结构。 */
  rowList: IRow[]
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
  /** firstvisible偏移数值，用于当前布局、统计或索引计算。 */
  firstVisibleOffset: number | null
  /** 行bands列表，保存同类数据的有序集合。 */
  rowBands: ITableLayoutSliceRowBand[]
}

/** 表格布局slice行band契约，用于约束内部流程中传递的数据结构。 */
export interface ITableLayoutSliceRowBand {
  /** 行号，用于定位页面内的目标行。 */
  rowNo: number
  /** 上侧偏移或边距，用于计算区域边界。 */
  top: number
  /** 下侧偏移或边距，用于计算区域边界。 */
  bottom: number
  /** 起始偏移量，用于在文本或表格片段内定位范围起点。 */
  startOffset: number
  /** 结束偏移数值，用于当前布局、统计或索引计算。 */
  endOffset: number
}

/** 表格布局片段单元格bounds契约，用于约束内部流程中传递的数据结构。 */
export interface ITableLayoutFragmentCellBounds {
  /** 分页片段表格标识，用于关联拆分后的表格片段。 */
  fragmentTableId: string
  /** 分页片段行标识，用于关联拆分后的表格行片段。 */
  fragmentTrId: string
  /** 分页片段单元格标识，用于关联拆分后的单元格片段。 */
  fragmentTdId: string
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
}

/**
 * 表格布局快照。
 *
 * 当前项目里的 hit-test / navigation / render 都只读这份结构，
 * 不再反复扫描 row / tr / td 动态拼推导。
 */
export interface ITableLayoutSnapshot {
  /** 版本号，用于判断缓存、布局或快照是否仍然有效。 */
  version: number
  sliceList: ITableLayoutCellSlice[]
  /** slicesby单元格key，用于在映射表或缓存中定位数据。 */
  slicesByCellKey: Map<TLogicalTableCellKey, ITableLayoutCellSlice[]>
  /** slice起始indexesby单元格key，用于在映射表或缓存中定位数据。 */
  sliceStartIndexesByCellKey: Map<TLogicalTableCellKey, number[]>
  /** slicesby单元格页面key，用于在映射表或缓存中定位数据。 */
  slicesByCellPageKey: Map<TCellPageKey, ITableLayoutCellSlice>
  /** slicesby片段单元格key，用于在映射表或缓存中定位数据。 */
  slicesByFragmentCellKey: Map<TFragmentTableCellKey, ITableLayoutCellSlice>
  /** slicesby逻辑片段单元格key，用于在映射表或缓存中定位数据。 */
  slicesByLogicalFragmentCellKey: Map<TFragmentTableCellKey, ITableLayoutCellSlice>
  /** slicesby单元格片段aliaskey，用于在映射表或缓存中定位数据。 */
  slicesByCellFragmentAliasKey: Map<TCellFragmentAliasKey, ITableLayoutCellSlice>
  /** slicesby页面no，用于定位对应页、行或序号。 */
  slicesByPageNo: Map<number, ITableLayoutCellSlice[]>
  /** 片段positionsby页面no，用于定位对应页、行或序号。 */
  fragmentPositionsByPageNo: Map<number, IElementPosition[]>
  /** 单元格boundsby片段表格id，用于关联对应业务对象。 */
  cellBoundsByFragmentTableId: Map<string, ITableLayoutFragmentCellBounds[]>
  /** 逻辑表格idby片段表格id，用于关联对应业务对象。 */
  logicalTableIdByFragmentTableId: Map<string, string>
  /** 逻辑表格索引by表格id，用于关联对应业务对象。 */
  logicalTableIndexByTableId: Map<string, number>
}

/** build表格布局snapshotrequest契约，用于约束内部流程中传递的数据结构。 */
export interface IBuildTableLayoutSnapshotRequest {
  /** 版本号，用于判断缓存、布局或快照是否仍然有效。 */
  version: number
}
