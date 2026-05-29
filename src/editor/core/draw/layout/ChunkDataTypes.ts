/** 分块scope类型，用于约束内部流程中传递的数据结构。 */
export type TChunkScope = 'document' | 'table' | 'table-cell'

/** document分块kind类型，用于约束内部流程中传递的数据结构。 */
export type TDocumentChunkKind = 'page' | 'paragraph' | 'hard-slice'

/** 表格单元格分块kind类型，用于约束内部流程中传递的数据结构。 */
export type TTableCellChunkKind = 'cell-row' | 'hard-slice'

/** 表格分块kind类型，用于约束内部流程中传递的数据结构。 */
export type TTableChunkKind = 'table' | 'table-fragment' | 'table-cell'

/** 分块kind类型，用于约束内部流程中传递的数据结构。 */
export type TChunkKind =
  | TDocumentChunkKind
  | TTableCellChunkKind
  | TTableChunkKind

/** 分块索引范围契约，用于约束内部流程中传递的数据结构。 */
export interface IChunkIndexRange {
  /** chunk 起始元素索引，闭区间。 */
  startIndex: number
  /** chunk 结束元素索引，闭区间。 */
  endIndex: number
  /** chunk 内元素数量。 */
  elementCount: number
}

/** 分块页面范围契约，用于约束内部流程中传递的数据结构。 */
export interface IChunkPageRange {
  /** chunk 代表的单页页码；跨页或未知时为 null。 */
  pageNo: number | null
  /** chunk 覆盖的起始页码；未完成布局时为 null。 */
  startPageNo: number | null
  /** chunk 覆盖的结束页码；未完成布局时为 null。 */
  endPageNo: number | null
  /** chunk 覆盖页数；未知时为 0。 */
  pageCount: number
}

/** 分块行范围契约，用于约束内部流程中传递的数据结构。 */
export interface IChunkRowRange {
  /** chunk 在所属页或单元格内的起始行号。 */
  startRowNo: number | null
  /** chunk 在所属页或单元格内的结束行号。 */
  endRowNo: number | null
  /** chunk 在全局 runtime rowList 中的起始行号。 */
  startRowIndex: number | null
  /** chunk 在全局 runtime rowList 中的结束行号。 */
  endRowIndex: number | null
}

/** 分块childref契约，用于约束内部流程中传递的数据结构。 */
export interface IChunkChildRef {
  /** 子 chunk 所属数据域。 */
  scope: TChunkScope
  /** 子 chunk 类型。 */
  kind: TChunkKind
  /** 子 chunk id 或稳定 key。 */
  id: number | string
  /** 子 chunk 覆盖页码。 */
  pageNo: number | null
  /** 子 chunk 起始索引，闭区间。 */
  startIndex: number
  /** 子 chunk 结束索引，闭区间。 */
  endIndex: number
}

/** 分块relation契约，用于约束内部流程中传递的数据结构。 */
export interface IChunkRelation {
  /** 当前 chunk 是否是另一个 chunk 的子元素。 */
  isChild: boolean
  /** 父 chunk 所属数据域；根 chunk 为 null。 */
  parentScope: TChunkScope | null
  /** 父 chunk 类型；根 chunk 为 null。 */
  parentKind: TChunkKind | null
  /** 父 chunk id 或稳定 key；根 chunk 为 null。 */
  parentId: number | string | null
  /** 当前 chunk 的直接子元素引用。 */
  childChunkList: IChunkChildRef[]
}

/** 分块脏区state契约，用于约束内部流程中传递的数据结构。 */
export interface IChunkDirtyState {
  /** chunk 是否被最近的编辑命中。 */
  dirty: boolean
}

/** document分块契约，用于约束内部流程中传递的数据结构。 */
export interface IDocumentChunk
  extends IChunkIndexRange,
    IChunkPageRange,
    IChunkRelation,
    IChunkDirtyState {
  /** chunk 顺序编号。 */
  id: number
  /** chunk 所属数据域。 */
  scope: 'document'
  /** chunk 类型，用于区分页级切块、自然段落和超长段落硬切片。 */
  kind: TDocumentChunkKind
}

/** 表格分块片段范围契约，用于约束内部流程中传递的数据结构。 */
export interface ITableChunkFragmentRange extends IChunkRowRange {
  /** 当前范围是否是表格 chunk 的子元素。 */
  isChild: true
  /** 逻辑表格 id，用于把分页 fragment 归并到父表格 chunk。 */
  logicalTableId: string
  /** fragment 表格 id，对应分页后的单页表格片段。 */
  fragmentTableId: string
  /** fragment 所在页码。 */
  pageNo: number
  /** fragment 覆盖页数。 */
  pageCount: number
  /** fragment 在当前页的起始行号。 */
  startRowNo: number
  /** fragment 在当前页的结束行号。 */
  endRowNo: number
  /** fragment 在全局 runtime rowList 的起始行号。 */
  startRowIndex: number
  /** fragment 在全局 runtime rowList 的结束行号。 */
  endRowIndex: number
}

/** 表格分块单元格范围契约，用于约束内部流程中传递的数据结构。 */
export interface ITableChunkCellRange {
  /** 当前范围是否是表格 fragment / 表格 chunk 的子元素。 */
  isChild: true
  /** 逻辑单元格 key，用于定位 td 子 chunk。 */
  cellKey: string
  /** 逻辑表格 id，用于向上归属到表格 chunk。 */
  logicalTableId: string
  /** fragment 表格 id，用于绑定当前页表格片段。 */
  fragmentTableId: string
  /** fragment 行 id。 */
  fragmentTrId: string
  /** fragment 单元格 id。 */
  fragmentTdId: string
  /** cell slice 所在页码。 */
  pageNo: number
  /** 当前 slice 覆盖页数。 */
  pageCount: number
  /** 当前 slice 在逻辑 td.value 中的起始偏移。 */
  absoluteStart: number
  /** 当前 slice 在逻辑 td.value 中的结束偏移，右开区间。 */
  absoluteEnd: number
  /** 当前 slice 覆盖的起始 cell 内行号。 */
  startRowNo: number | null
  /** 当前 slice 覆盖的结束 cell 内行号。 */
  endRowNo: number | null
}

/** 表格分块范围契约，用于约束内部流程中传递的数据结构。 */
export interface ITableChunkRange extends IChunkRelation {
  /** 逻辑表格 id。 */
  logicalTableId: string
  /** 逻辑表格在主文档元素流中的索引。 */
  logicalTableIndex: number
  /** 表格开始页。 */
  startPageNo: number
  /** 表格结束页。 */
  endPageNo: number
  /** 表格覆盖页数。 */
  pageCount: number
  /** 表格开始页内的行号。 */
  startRowNo: number
  /** 表格结束页内的行号。 */
  endRowNo: number
  /** 表格全局起始行号。 */
  startRowIndex: number
  /** 表格全局结束行号。 */
  endRowIndex: number
  /** 表格分页 fragment 范围列表。 */
  fragmentRangeList: ITableChunkFragmentRange[]
  /** 表格子孙 cell chunk 范围列表。 */
  cellRangeList: ITableChunkCellRange[]
}

/** 表格单元格分块契约，用于约束内部流程中传递的数据结构。 */
export interface ITableCellChunk
  extends IChunkIndexRange,
    IChunkPageRange,
    IChunkRelation,
    IChunkDirtyState {
  /** 子 chunk 顺序编号。 */
  id: number
  /** chunk 所属数据域。 */
  scope: 'table-cell'
  /** 父表格 id。 */
  tableId: string
  /** 父表格在主文档中的逻辑索引。 */
  tableIndex: number
  /** 父行 id。 */
  trId: string
  /** 父单元格 id。 */
  tdId: string
  /** 父行逻辑索引。 */
  trIndex: number
  /** 父单元格逻辑索引。 */
  tdIndex: number
  /** 逻辑 cell key，用于和表格布局快照关联。 */
  cellKey: string
  /** 子 chunk 类型。 */
  kind: TTableCellChunkKind
  /** 子 chunk 所在的单元格行号；硬切片没有稳定行号时为 null。 */
  rowNo: number | null
  /** 父 fragment 所在页码；来自分页后的表格快照。 */
  pageNo: number | null
  /** 父表格 fragment id；用于把 td 子 chunk 绑定到表格 chunk。 */
  fragmentTableId: string | null
  /** 父行 fragment id。 */
  fragmentTrId: string | null
  /** 父单元格 fragment id。 */
  fragmentTdId: string | null
}

/** document分块索引stats契约，用于约束内部流程中传递的数据结构。 */
export interface IDocumentChunkIndexStats {
  /** 当前索引版本，每次重建递增。 */
  version: number
  /** chunk 总数。 */
  chunkCount: number
  /** 被编辑命中的脏 chunk 数量。 */
  dirtyChunkCount: number
  /** 当前 chunk 平均元素数量。 */
  averageElementCount: number
  /** 当前最大 chunk 元素数量。 */
  maxElementCount: number
  /** 最近一次重建耗时。 */
  lastBuildDuration: number
  /** 最近一次重建原因。 */
  lastBuildReason: string
  /** 最近一次编辑命中的 chunk 编号。 */
  lastDirtyChunkId: number | null
  /** 最近一次编辑命中的索引。 */
  lastDirtyIndex: number | null
  /** 最近一次编辑影响的 chunk 起始编号。 */
  lastDirtyStartChunkId: number | null
  /** 最近一次编辑影响的 chunk 结束编号。 */
  lastDirtyEndChunkId: number | null
  /** chunk 布局缓存条目数。 */
  layoutCacheCount: number
  /** chunk 布局缓存命中次数。 */
  layoutCacheHitCount: number
  /** chunk 布局缓存未命中次数。 */
  layoutCacheMissCount: number
  /** chunk 布局缓存写入次数。 */
  layoutCacheSetCount: number
  /** chunk 布局缓存清理次数。 */
  layoutCacheClearCount: number
  /** chunk 布局缓存命中率。 */
  layoutCacheHitRate: number
}

/** document分块布局缓存调用载荷，聚合执行该操作所需的输入数据。 */
export interface IDocumentChunkLayoutCachePayload {
  /** chunk 描述。 */
  chunk: IDocumentChunk
  /** 布局范围起始元素索引。 */
  startIndex: number
  /** 布局范围结束元素索引。 */
  endIndex: number
  /** 当前页码。 */
  pageNo: number
  /** 布局起始 X。 */
  startX: number
  /** 布局起始 Y。 */
  startY: number
  /** 可用正文宽度。 */
  innerWidth: number
}

/** 表格单元格分块索引stats契约，用于约束内部流程中传递的数据结构。 */
export interface ITableCellChunkIndexStats {
  /** 当前索引版本，每次重建递增。 */
  version: number
  /** 当前缓存的逻辑单元格数量。 */
  cellCount: number
  /** 当前子 chunk 总数量。 */
  chunkCount: number
  /** 当前脏子 chunk 数量。 */
  dirtyChunkCount: number
  /** 当前最大单元格子 chunk 数量。 */
  maxChunkCountPerCell: number
  /** 当前最大子 chunk 元素数量。 */
  maxElementCount: number
  /** 当前绑定到 fragment/page 父 chunk 的子 chunk 数量。 */
  fragmentBoundChunkCount: number
  /** 最近一次重建耗时。 */
  lastBuildDuration: number
  /** 最近一次重建原因。 */
  lastBuildReason: string
  /** 最近一次命中的逻辑 cell key。 */
  lastDirtyCellKey: string | null
  /** 最近一次命中的 td 局部索引。 */
  lastDirtyIndex: number | null
  /** 最近一次命中的子 chunk 编号。 */
  lastDirtyChunkId: number | null
  /** 最近一次命中是否成功。 */
  lastLookupHit: boolean
}

/** 表格分块范围索引stats契约，用于约束内部流程中传递的数据结构。 */
export interface ITableChunkRangeIndexStats {
  /** 当前索引版本，每次重建递增。 */
  version: number
  /** 当前逻辑表格数量。 */
  tableCount: number
  /** 当前 fragment 范围数量。 */
  fragmentRangeCount: number
  /** 当前 cell 子范围数量。 */
  cellRangeCount: number
  /** 最近一次重建耗时。 */
  lastBuildDuration: number
  /** 最近一次重建原因。 */
  lastBuildReason: string
  /** 最近一次查询命中的表格 id。 */
  lastLookupTableId: string | null
  /** 最近一次查询命中的范围页数。 */
  lastLookupPageSpan: number
}

/** 根据起止页计算 chunk 覆盖页数。 */
export function getChunkPageCount(
  startPageNo: number | null,
  endPageNo: number | null
) {
  if (startPageNo === null || endPageNo === null || endPageNo < startPageNo) {
    return 0
  }
  return endPageNo - startPageNo + 1
}
