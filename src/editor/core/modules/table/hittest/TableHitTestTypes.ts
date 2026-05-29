import { ICurrentPosition } from '../../../../interface/Position'
import { IPagePoint } from '../../../event/pointer/coordinates/PagePointTypes'

/**
 * selection-start / drag 统一消费的边界结果。
 *
 * absoluteIndex 是逻辑绝对边界，
 * localIndex / localBoundaryIndex 则保留当前命中对象内部的局部索引语义。
 */
export interface IResolvedSelectionBoundary {
  /** 文档级元素索引，用于跨片段定位原始元素。 */
  absoluteIndex: number
  /** local索引，用于定位对应元素、行或片段。 */
  localIndex: number
  /** localboundary索引，用于定位对应元素、行或片段。 */
  localBoundaryIndex?: number
  /** 命中目标索引，用于定位指针事件落点对应的元素。 */
  hitTargetIndex?: number
}

/** 表格命中testrequest契约，用于约束内部流程中传递的数据结构。 */
export interface ITableHitTestRequest {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo?: number
  /** 页面内坐标，用于把指针位置映射到具体页。 */
  pagePoint: IPagePoint | null
  /** 起始坐标，用于记录拖拽或选区开始位置。 */
  startPosition: ICurrentPosition | null
}

export interface ITableHitTestResult {
  /** 位置命中结果，保存指针坐标解析后的索引和上下文。 */
  positionResult: ICurrentPosition | null
  boundary: IResolvedSelectionBoundary | null
}
