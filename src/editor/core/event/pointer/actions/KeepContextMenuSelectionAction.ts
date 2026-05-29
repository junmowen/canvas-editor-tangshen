import { MouseEventButton } from '../../../../dataset/enum/Event'
import { CanvasEvent } from '../../CanvasEvent'
import { IPointerCoordinatePayload } from '../coordinates/PointerCoordinateTypes'

interface IKeepContextMenuSelectionActionPayload {
  evt: MouseEvent
  host: CanvasEvent
  coordinates: IPointerCoordinatePayload
}

export function keepContextMenuSelectionAction(
  payload: IKeepContextMenuSelectionActionPayload
): boolean {
  const { evt, host, coordinates } = payload
  const rangeManager = host.getDraw().getComponents().range
  const range = rangeManager.getEditBoundaryRange()
  if (
    evt.button !== MouseEventButton.RIGHT ||
    (!range.isCrossRowCol && rangeManager.getIsCollapsed())
  ) {
    return false
  }
  host.getPointerSession().lastPointerCoordinates = coordinates
  return true
}
