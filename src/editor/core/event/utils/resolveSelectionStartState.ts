import { ICurrentPosition } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import { Draw } from '../../draw/Draw'
import { resolveTableSelectionStartState } from '../../table/selection/resolveTableSelectionStartState'
import { IPagePoint } from './PagePointTypes'
import { resolvePointerMouseDownIndex } from './resolvePointerMouseDownIndex'
import { resolvePositionAtIndex } from './resolvePositionAtIndex'

interface IResolveSelectionStartStatePayload {
  draw: Draw
  x: number
  y: number
  pageNo?: number
  pagePoint: IPagePoint | null
  range: IRange
}

export interface IResolvedSelectionStartState {
  positionResult: ICurrentPosition
  mouseDownIndex: number
}

export function resolveSelectionStartState(
  payload: IResolveSelectionStartStatePayload
): IResolvedSelectionStartState | null {
  const { draw, x, y, pageNo, pagePoint, range } = payload
  const components = draw.getComponents()
  const hitTestResult = components.tableHitTestService.resolve({
    x,
    y,
    pageNo,
    pagePoint,
    startPosition: null
  })
  const positionResult = hitTestResult.positionResult
  const boundary = hitTestResult.boundary
  if (!positionResult || !boundary) return null

  const {
    absoluteIndex: currentIndex,
    localIndex: currentLocalIndex,
    hitTargetIndex
  } = boundary
  // 命中结果通常只给逻辑索引，这里统一回填当前/目标坐标，避免各处自己做兜底。
  const currentPosition = resolvePositionAtIndex(draw, currentLocalIndex, {
    fallbackToLast: true
  })
  const hitTargetPosition =
    hitTargetIndex !== undefined
      ? resolvePositionAtIndex(draw, hitTargetIndex, {
          fallbackToLast: true
        }) || currentPosition
      : currentPosition
  const isRepeatCollapsedHit =
    range.startIndex === range.endIndex &&
    (hitTargetIndex === range.endIndex ||
      currentLocalIndex === range.endIndex ||
      currentIndex === range.endIndex)

  if (positionResult.isTable) {
    const isRepeatCollapsedLeftEdgeHit =
      isRepeatCollapsedHit &&
      pagePoint &&
      hitTargetPosition &&
      pagePoint.x <= hitTargetPosition.coordinate.leftTop[0] + 1
    const tableStartState = resolveTableSelectionStartState({
      draw,
      pagePoint,
      positionResult,
      currentIndex,
      currentLocalIndex,
      hitTargetIndex
    })
    return {
      positionResult: isRepeatCollapsedLeftEdgeHit
        ? {
            ...positionResult,
            forceNotRightBoundaryHit: true
          }
        : isRepeatCollapsedHit
          ? {
              ...positionResult,
              hitTargetIndex: undefined
            }
          : positionResult,
      mouseDownIndex: isRepeatCollapsedHit
        ? hitTargetIndex ?? tableStartState.mouseDownIndex
        : tableStartState.mouseDownIndex
    }
  }

  const mouseDownIndex = resolvePointerMouseDownIndex({
    pagePoint,
    hitTargetPosition,
    currentIndex,
    hitTargetIndex,
    fallbackIndex: currentIndex
  })
  const isRepeatCollapsedTextHit = !!(
    isRepeatCollapsedHit &&
    pagePoint &&
    hitTargetPosition &&
    pagePoint.x < hitTargetPosition.coordinate.rightTop[0] - 1
  )
  const resolvedPositionResult = isRepeatCollapsedTextHit
    ? {
        ...positionResult,
        forceNotRightBoundaryHit: true
      }
    : positionResult
  return {
    positionResult: resolvedPositionResult,
    mouseDownIndex
  }
}
