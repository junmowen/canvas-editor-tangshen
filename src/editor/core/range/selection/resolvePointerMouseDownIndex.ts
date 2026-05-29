import { IElementPosition } from '../../../interface/Element'
import { IPagePoint } from '../../event/pointer/coordinates/PagePointTypes'

/** resolvepointer鼠标down索引调用载荷，聚合执行该操作所需的输入数据。 */
interface IResolvePointerMouseDownIndexPayload {
  /** 页面内坐标，用于把指针位置映射到具体页。 */
  pagePoint: IPagePoint | null
  /** 命中目标位置，用于描述布局或命中的空间范围。 */
  hitTargetPosition: IElementPosition | null
  /** 当前元素索引，用于定位命中或遍历所在位置。 */
  currentIndex: number
  /** 命中目标索引，用于定位指针事件落点对应的元素。 */
  hitTargetIndex?: number
  /** 降级索引，用于定位对应元素、行或片段。 */
  fallbackIndex: number
}

export function resolvePointerMouseDownIndex(
  payload: IResolvePointerMouseDownIndexPayload
) {
  const {
    pagePoint,
    hitTargetPosition,
    currentIndex,
    hitTargetIndex,
    fallbackIndex
  } = payload

  if (!pagePoint || !hitTargetPosition) {
    return hitTargetIndex ?? fallbackIndex
  }

  const collapseThresholdX =
    (hitTargetPosition.coordinate.leftTop[0] +
      hitTargetPosition.coordinate.rightTop[0]) /
    2

  return pagePoint.x < collapseThresholdX
    ? (hitTargetIndex ?? currentIndex) - 1
    : hitTargetIndex ?? currentIndex
}
