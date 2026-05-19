import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'

/** 表格局部重分页 patch 结果。 */
export interface ITableLocalRelayoutPatchResult {
  /** 是否已经用局部表格重分页接管本次输入。 */
  patched: boolean
  /** 本次局部重分页起始页码。 */
  pageNo?: number
  /** 本次局部重分页影响的页码列表。 */
  affectedPageNoList?: number[]
  /** 未接管时的明确原因。 */
  reason?: string
}

/** 表格局部重分页统计。 */
export interface ITableLocalRelayoutStats {
  /** 尝试局部表格重分页的次数。 */
  attemptCount: number
  /** 成功接管表格输入的次数。 */
  patchSuccessCount: number
  /** 因安全边界不满足而回退完整 layout 的次数。 */
  patchFailCount: number
  /** 最近一次失败原因。 */
  lastFailReason: string | null
  /** 最近一次局部重分页耗时。 */
  lastDuration: number
  /** 累计局部重分页耗时。 */
  totalDuration: number
  /** 最大局部重分页耗时。 */
  maxDuration: number
  /** 最近一次尝试的逻辑表 id。 */
  lastLogicalTableId: string | null
  /** 最近一次快照中的总 slice 数。 */
  lastSnapshotSliceCount: number
  /** 最近一次命中的 fragment table 数。 */
  lastMatchedFragmentTableCount: number
  /** 最近一次扫描到的表格行数量。 */
  lastScannedTableRowCount: number
}

/** 当前逻辑表在运行时布局中的旧 fragment 范围。 */
export interface ITableRuntimeRange {
  /** 逻辑表在 runtime rowList 中的起点。 */
  runtimeRowStart: number
  /** 旧 fragment 起始页码。 */
  pageStart: number
  /** 旧 fragment 在起始页内的行偏移。 */
  pageStartRowOffset: number
  /** 旧 fragment 占用页数。 */
  pageCount: number
  /** 旧 fragment 起始行对象。 */
  firstRow: IRow
  /** 旧 fragment 结束行对象。 */
  lastRow: IRow
}

/** 表格局部重分页命中的当前逻辑表。 */
export interface ITableLocalRelayoutTarget {
  /** 源逻辑表元素。 */
  sourceTable: IElement
  /** 源逻辑表在主文档元素流中的索引。 */
  tableIndex: number
  /** 旧运行时 fragment 范围。 */
  oldRange: ITableRuntimeRange
}

/** 解析旧 fragment 范围时的扫描统计。 */
export interface ITableRuntimeRangeScanStats {
  /** 当前快照中的 slice 数。 */
  snapshotSliceCount: number
  /** 当前逻辑表命中的 fragment table 数。 */
  matchedFragmentTableCount: number
  /** 扫描到的表格行数量。 */
  scannedTableRowCount: number
}

/** 当前表格局部重分页目标解析结果。 */
export interface ITableLocalRelayoutTargetResult {
  /** 是否解析到可安全局部重分页的目标表格。 */
  target: ITableLocalRelayoutTarget | null
  /** 未命中或安全边界失败时的原因。 */
  reason?: string
  /** 逻辑表 id，供统计展示最近尝试目标。 */
  logicalTableId?: string
  /** 旧 fragment 范围扫描统计。 */
  scanStats?: ITableRuntimeRangeScanStats
}

/** 原表格分页器重新测量当前逻辑表后的结果。 */
export interface ITableMeasureResult {
  /** 逻辑表格行，写回 runtime rowList。 */
  rowList: IRow[]
  /** 分页后的 fragment 页行，写回 pageRowList。 */
  pageRowList: IRow[][]
}
