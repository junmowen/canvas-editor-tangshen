import { ICurrentPosition } from '../../../interface/Position'
import { Draw } from '../../draw/Draw'
import { IPagePoint } from '../../event/utils/PagePointTypes'
import { resolvePointerMouseDownIndex } from '../../event/utils/resolvePointerMouseDownIndex'

export interface IResolveTableSelectionStartStatePayload {
  draw: Draw
  pagePoint: IPagePoint | null
  positionResult: ICurrentPosition
  currentIndex: number
  currentLocalIndex: number
  hitTargetIndex?: number
}

export interface IResolvedTableSelectionStartState {
  mouseDownIndex: number
}

export function resolveTableSelectionStartState(
  payload: IResolveTableSelectionStartStatePayload
): IResolvedTableSelectionStartState {
  const {
    draw,
    pagePoint,
    positionResult,
    currentIndex,
    currentLocalIndex,
    hitTargetIndex
  } = payload

  const positionList = draw.getPosition().getPositionList()
  const currentPosition =
    positionList[currentLocalIndex] || positionList[positionList.length - 1] || null
  const hitTargetPosition =
    hitTargetIndex !== undefined
      ? positionList[hitTargetIndex] || currentPosition
      : currentPosition

  const pointerMouseDownFallbackIndex =
    positionResult.tdValueIndex !== undefined
      ? positionResult.tdValueIndex
      : currentIndex
  const mouseDownIndex = resolvePointerMouseDownIndex({
    pagePoint,
    hitTargetPosition,
    currentIndex,
    hitTargetIndex,
    fallbackIndex: pointerMouseDownFallbackIndex
  })

  return {
    mouseDownIndex
  }
}
