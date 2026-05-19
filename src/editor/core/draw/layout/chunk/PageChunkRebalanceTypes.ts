import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'

/** 页级 chunk 窗口 rebalance 结果。 */
export interface IPageChunkRebalanceResult {
  /** 窗口起始元素索引。 */
  startIndex: number
  /** 旧窗口元素数量。 */
  oldElementCount: number
  /** 新窗口元素列表。 */
  elementList: IElement[]
  /** 新窗口页行列表，页码为相对窗口页码。 */
  pageRowList: IRow[][]
  /** 新窗口位置列表。 */
  positionList: IElementPosition[]
  /** 替换前窗口行数量。 */
  oldRowCount: number
  /** 替换后窗口行数量。 */
  nextRowCount: number
  /** 替换前窗口页数量。 */
  oldPageCount: number
  /** 替换后窗口页数量。 */
  nextPageCount: number
  /** 旧窗口结束页码，用于平移后续页面。 */
  oldWindowEndPageNo: number
  /** 窗口尾页边界是否变化，变化时需要异步同步下一页。 */
  shouldPropagateNext: boolean
  /** 旧窗口与新窗口共同覆盖的页码，用于渲染层清理移动后的旧像素。 */
  affectedPageNoList: number[]
  /** 当前窗口是否包含表格迁移，包含时渲染前必须清理 base / overlay / 工具层。 */
  requiresSurfaceClear: boolean
  /** 测量窗口覆盖的实际页数，表格父范围可能会把旧窗口扩到旧表格结束页。 */
  measuredWindowPageCount: number
}
