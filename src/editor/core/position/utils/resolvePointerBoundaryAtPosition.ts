import { IElementPosition } from '../../../interface/Element'

/** resolvepointerboundaryat位置调用载荷，聚合执行该操作所需的输入数据。 */
interface IResolvePointerBoundaryAtPositionPayload {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: IElementPosition
  /** 当前边界索引，用于在控件范围内定位临界点。 */
  currentBoundaryIndex: number
  /** previousboundary索引，用于定位对应元素、行或片段。 */
  previousBoundaryIndex: number
  canCollapseToPrevious: boolean
  /** collapsetopreviousthresholdx数值，用于当前布局、统计或索引计算。 */
  collapseToPreviousThresholdX?: number
}

/** resolvedpointerboundaryat位置契约，用于约束内部流程中传递的数据结构。 */
interface IResolvedPointerBoundaryAtPosition {
  /** 边界索引，用于定位控件或选区的临界元素。 */
  boundaryIndex: number
}

export function resolvePointerBoundaryAtPosition(
  payload: IResolvePointerBoundaryAtPositionPayload
): IResolvedPointerBoundaryAtPosition {
  const {
    x,
    position,
    currentBoundaryIndex,
    previousBoundaryIndex,
    canCollapseToPrevious,
    collapseToPreviousThresholdX
  } = payload

  let boundaryIndex = currentBoundaryIndex

  if (canCollapseToPrevious) {
    const {
      coordinate: {
        leftTop: [leftX],
        rightTop: [rightX]
      }
    } = position
    const collapseThresholdX =
      collapseToPreviousThresholdX ?? leftX + (rightX - leftX) / 2
    if (x < collapseThresholdX) {
      boundaryIndex = previousBoundaryIndex
    }
  }

  return {
    boundaryIndex
  }
}

export function createCollapsedLeftCursorPosition(
  position: IElementPosition,
  boundaryIndex: number
): IElementPosition {
  return {
    ...position,
    index: boundaryIndex,
    metrics: {
      ...position.metrics,
      width: 0
    },
    coordinate: {
      leftTop: [...position.coordinate.leftTop],
      leftBottom: [...position.coordinate.leftBottom],
      rightTop: [position.coordinate.leftTop[0], position.coordinate.rightTop[1]],
      rightBottom: [
        position.coordinate.leftBottom[0],
        position.coordinate.rightBottom[1]
      ]
    }
  }
}
