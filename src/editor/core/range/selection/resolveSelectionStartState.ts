import { ICurrentPosition } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import { Draw } from '../../draw/Draw'
import { resolveTablePointerHit } from '../../modules/table/hittest/resolveTablePointerHit'
import { resolveTableSelectionStartState } from '../../modules/table/selection/resolveTableSelectionStartState'
import { IPagePoint } from '../../event/pointer/coordinates/PagePointTypes'
import { resolvePointerMouseDownIndex } from './resolvePointerMouseDownIndex'
import { resolvePositionAtIndex } from '../../position/utils/resolvePositionAtIndex'

/** resolve选区起始state调用载荷，聚合执行该操作所需的输入数据。 */
interface IResolveSelectionStartStatePayload {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo?: number
  /** 页面内坐标，用于把指针位置映射到具体页。 */
  pagePoint: IPagePoint | null
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
}

/** resolved选区起始state契约，用于约束内部流程中传递的数据结构。 */
export interface IResolvedSelectionStartState {
  /** 位置命中结果，保存指针坐标解析后的索引和上下文。 */
  positionResult: ICurrentPosition
  /** 鼠标按下时的元素索引，用于确定拖拽或选区起点。 */
  mouseDownIndex: number
}

export function resolveSelectionStartState(
  payload: IResolveSelectionStartStatePayload
): IResolvedSelectionStartState | null {
  const { draw, x, y, pageNo, pagePoint, range } = payload
  const hitTestResult = resolveTablePointerHit({
    draw,
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
    useLastPositionWhenMissing: true
  })
  const hitTargetPosition =
    hitTargetIndex !== undefined
      ? resolvePositionAtIndex(draw, hitTargetIndex, {
          useLastPositionWhenMissing: true
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
    defaultIndex: currentIndex
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
