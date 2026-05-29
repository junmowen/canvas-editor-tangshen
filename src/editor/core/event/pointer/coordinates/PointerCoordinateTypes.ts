import { IPagePoint } from './PagePointTypes'

/** pointerpoint契约，用于约束内部流程中传递的数据结构。 */
export interface IPointerPoint {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
}

/** viewportpoint契约，用于约束内部流程中传递的数据结构。 */
export interface IViewportPoint extends IPointerPoint {}

/** containerpoint契约，用于约束内部流程中传递的数据结构。 */
export interface IContainerPoint extends IPointerPoint {}

/** resolved页面point契约，用于约束内部流程中传递的数据结构。 */
export interface IResolvedPagePoint extends IPagePoint {
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 是否精确命中页面，用于过滤落在页面外的指针坐标。 */
  isExactPage: boolean
}

/** pointercoordinate调用载荷，聚合执行该操作所需的输入数据。 */
export interface IPointerCoordinatePayload {
  viewport: IViewportPoint
  /** 容器节点，用于挂载当前组件的 DOM 结构。 */
  container: IContainerPoint | null
  page: IResolvedPagePoint | null
  deltaViewport: IPointerPoint
  /** 数据来源标识，用于区分渲染、缓存或事件来源。 */
  source: 'mouse' | 'drag'
}
