import { IElementPosition } from '../../../interface/Element'

interface IResolvePointerBoundaryAtPositionPayload {
  x: number
  position: IElementPosition
  currentBoundaryIndex: number
  previousBoundaryIndex: number
  canCollapseToPrevious: boolean
  collapseToPreviousThresholdX?: number
}

interface IResolvedPointerBoundaryAtPosition {
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
