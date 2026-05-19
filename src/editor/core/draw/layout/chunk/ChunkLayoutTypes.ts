import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import { IDocumentChunk } from '../ChunkDataTypes'

/** chunk 布局补丁执行结果。 */
export interface IChunkLayoutPatchResult {
  /** 是否成功写回运行时布局。 */
  patched: boolean
  /** 成功 patch 的页码，供渲染层做单页缓存失效。 */
  pageNo?: number
  /** 成功 patch 影响的页码集合，页级 chunk 搬移时用于清理旧页和新页残影。 */
  affectedPageNoList?: number[]
  /** 是否需要在重绘前强制清理 base / overlay / 工具层，表格迁移场景用于避免残留线条。 */
  requiresSurfaceClear?: boolean
  /** 是否必须回退同步完整 layout；用于表格在传播窗口之后的正确性场景。 */
  requiresFullLayout?: boolean
  /** 未写回原因，用于观察商业级 chunk 管线覆盖范围。 */
  reason?: string
}

/** chunk 布局管线统计。 */
export interface IChunkLayoutPipelineStats {
  /** 尝试 patch 次数。 */
  attemptCount: number
  /** 成功 patch 次数。 */
  patchSuccessCount: number
  /** 失败次数。 */
  patchFailCount: number
  /** 最近一次 patch 结果。 */
  lastResult: 'patched' | 'failed' | null
  /** 最近一次失败原因。 */
  lastFailReason: string | null
  /** 最近一次 guard 阶段耗时。 */
  lastGuardDuration: number
  /** 最近一次测量阶段耗时。 */
  lastMeasureDuration: number
  /** 最近一次运行时写回阶段耗时。 */
  lastPatchDuration: number
  /** 累计 guard 阶段耗时。 */
  totalGuardDuration: number
  /** 累计测量阶段耗时。 */
  totalMeasureDuration: number
  /** 累计运行时写回阶段耗时。 */
  totalPatchDuration: number
  /** 页级 rebalance 同步 patch 次数。 */
  pageRebalanceSyncPatchCount: number
  /** 页级 rebalance 异步 patch 次数。 */
  pageRebalanceAsyncPatchCount: number
  /** 页级 rebalance 异步传播调度次数。 */
  pageRebalanceScheduleCount: number
  /** 页级 rebalance 边界继续传播次数。 */
  pageRebalanceBoundaryPropagateCount: number
  /** 页级 rebalance 异步队列历史最大待处理页数。 */
  pageRebalanceMaxPendingPageCount: number
  /** 页级 rebalance 当前仍在等待异步处理的页数。 */
  pageRebalancePendingPageCount: number
  /** 页级 rebalance 最近一次异步处理页码。 */
  pageRebalanceLastAsyncPageNo: number | null
  /** dirty range planner 旁路计算次数。 */
  dirtyRangePlanCount: number
  /** 最近一次 planner 输出起始页。 */
  dirtyRangeLastStartPageNo: number | null
  /** 最近一次 planner 输出结束页。 */
  dirtyRangeLastEndPageNo: number | null
  /** 最近一次 planner 输出页数。 */
  dirtyRangeLastPageCount: number
  /** 最近一次 planner 输出原因。 */
  dirtyRangeLastReason: string | null
  /** 最近一次 planner 是否覆盖表格范围。 */
  dirtyRangeLastIncludesTableRange: boolean
  /** planner 历史最大页数。 */
  dirtyRangeMaxPageCount: number
  /** planner 输出没有覆盖实际影响页的次数。 */
  dirtyRangeMissActualCount: number
  /** 最近一次实际影响页但未被 planner 覆盖的页数。 */
  dirtyRangeLastMissingActualPageCount: number
  /** 最近一次未覆盖的实际页码。 */
  dirtyRangeLastMissingActualPageNoList: number[]
  /** 最近一次实际影响页起始页。 */
  dirtyRangeLastActualStartPageNo: number | null
  /** 最近一次实际影响页结束页。 */
  dirtyRangeLastActualEndPageNo: number | null
  /** dirty range planner 接管异步传播起点次数。 */
  dirtyRangeScheduleTakeoverCount: number
  /** planner 漏实际页时回退旧异步传播起点次数。 */
  dirtyRangeScheduleFallbackCount: number
}

/** chunk patch 前的上下文，负责把命中判断和后续测量输入解耦。 */
export interface IChunkLayoutPatchContext {
  /** 命中的文档 chunk。 */
  chunk: IDocumentChunk
  /** chunk 所在页码，首版仅支持单页 chunk。 */
  pageNo: number
  /** 当前运行时中 chunk 对应的旧行。 */
  oldChunkRows: IRow[]
  /** 当前 chunk 首行在页内的旧行号。 */
  oldPageRowStart: number
  /** 当前 chunk 的元素列表。 */
  chunkElementList: IElement[]
  /** 当前 patch 的结束索引。 */
  endIndex: number
  /** 旧布局中需要替换的结束索引。 */
  oldEndIndex: number
  /** 输入态插入元素数量。 */
  insertedCount: number
  /** 布局起始 X。 */
  startX: number
  /** 布局起始 Y。 */
  startY: number
  /** 正文可用宽度。 */
  innerWidth: number
}

/** chunk 局部测量结果。 */
export interface IChunkLayoutMeasureResult {
  /** 当前 chunk 的真实元素列表，运行时元素切片只能以它为准。 */
  elementList: IElement[]
  /** 新测量出的 chunk 行列表。 */
  rowList: IRow[]
  /** 新测量出的 chunk 位置列表。 */
  positionList: IElementPosition[]
  /** 新 chunk 总高度。 */
  nextHeight: number
  /** 旧 chunk 总高度。 */
  oldHeight: number
}
