import { ICurrentPosition } from '../../../interface/Position'
import { IPagePoint } from '../../event/utils/PagePointTypes'

/**
 * selection-start / drag 统一消费的边界结果。
 *
 * absoluteIndex 是逻辑绝对边界，
 * localIndex / localBoundaryIndex 则保留当前命中对象内部的局部索引语义。
 */
export interface IResolvedSelectionBoundary {
  absoluteIndex: number
  localIndex: number
  localBoundaryIndex?: number
  hitTargetIndex?: number
}

/** 表格命中测试输入。 */
export interface ITableHitTestRequest {
  x: number
  y: number
  pageNo?: number
  pagePoint: IPagePoint | null
  startPosition: ICurrentPosition | null
}

/** 表格命中测试输出。 */
export interface ITableHitTestResult {
  positionResult: ICurrentPosition | null
  boundary: IResolvedSelectionBoundary | null
}
