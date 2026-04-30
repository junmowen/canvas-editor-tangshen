import { IElementPosition } from '../../../interface/Element'
import { IPagePoint } from './PagePointTypes'

interface IResolvePointerMouseDownIndexPayload {
  pagePoint: IPagePoint | null
  hitTargetPosition: IElementPosition | null
  currentIndex: number
  hitTargetIndex?: number
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
