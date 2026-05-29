import { TEXTLIKE_ELEMENT_TYPE } from '../../../../dataset/constant/Element'
import { CanvasEvent } from '../../CanvasEvent'
import { isElementInControl } from '../../../modules/control/hittest/ControlHitTest'
import { hasListSelectionContext } from '../../../modules/list/interaction/ListSelectionPolicy'
import { captureDragSnapshot } from '../intents/drag-drop/CaptureDragSnapshotIntent'
import {
  IPointerCoordinatePayload,
  IResolvedPagePoint
} from '../coordinates/PointerCoordinateTypes'

interface IStartSelectedRangeDragActionPayload {
  host: CanvasEvent
  pagePoint: IResolvedPagePoint
  coordinates: IPointerCoordinatePayload
}

export function startSelectedRangeDragAction(
  payload: IStartSelectedRangeDragActionPayload
): boolean {
  const { host, pagePoint, coordinates } = payload
  const draw = host.getDraw()
  const session = host.getPointerSession()
  const rangeManager = draw.getComponents().range
  const range = rangeManager.getEditBoundaryRange()
  const selectedElementList = rangeManager.getSelectionElementList() || []
  const isPureTextSelection =
    !!selectedElementList.length &&
    selectedElementList.every(
      element =>
        (!element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)) &&
        !isElementInControl(element)
    )
  const isListSelection = hasListSelectionContext(selectedElementList)

  if (
    session.isAllowDrag ||
    draw.isReadonly() ||
    range.startIndex === range.endIndex ||
    (isPureTextSelection && !isListSelection)
  ) {
    return false
  }

  const isPointInRange = rangeManager.getIsPointInRange(pagePoint.x, pagePoint.y)
  if (!isPointInRange) return false

  captureDragSnapshot(host)
  session.lastPointerCoordinates = coordinates
  return true
}
