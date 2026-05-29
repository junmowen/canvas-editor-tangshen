import { deepClone } from '../../../../utils'
import { CanvasEvent } from '../../CanvasEvent'
import { resolveSelectionStartState } from '../../../range/selection/resolveSelectionStartState'
import { applyPointerPositionContext } from '../utils/applyPointerPositionContext'
import { runSelectionStartIntent } from '../intents/selection/SelectionStartIntent'
import {
  IPointerCoordinatePayload,
  IResolvedPagePoint
} from '../coordinates/PointerCoordinateTypes'

interface IStartSelectionActionPayload {
  evt: MouseEvent
  host: CanvasEvent
  pagePoint: IResolvedPagePoint
  coordinates: IPointerCoordinatePayload
}

export function startSelectionAction(
  payload: IStartSelectionActionPayload
): void {
  const { evt, host, pagePoint, coordinates } = payload
  const draw = host.getDraw()
  const session = host.getPointerSession()
  const coordinate = draw.getCoordinate()
  const range = draw.getComponents().range.getEditBoundaryRange()
  const oldPositionContext = deepClone(coordinate.getPositionContext())
  session.isAllowSelection = true
  const selectionStartState = resolveSelectionStartState({
    draw,
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: Number(pagePoint.pageIndex),
    pagePoint,
    range
  })
  const positionResult = selectionStartState?.positionResult
  if (!positionResult) {
    session.lastPointerCoordinates = coordinates
    return
  }

  session.mouseDownStartPosition = {
    ...positionResult,
    index: selectionStartState.mouseDownIndex,
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: pagePoint.pageNo
  }
  session.mouseDownStartCoordinates = coordinates
  session.lastPointerCoordinates = coordinates

  applyPointerPositionContext(coordinate, positionResult)
  runSelectionStartIntent({
    host,
    evt,
    oldPositionContextTdId: oldPositionContext.tdId,
    isReadonly: draw.isReadonly(),
    positionResult
  })
}
