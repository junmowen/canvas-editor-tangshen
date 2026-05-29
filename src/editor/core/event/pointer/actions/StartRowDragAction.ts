import { MouseEventButton } from '../../../../dataset/enum/Event'
import { CanvasEvent } from '../../CanvasEvent'
import { resolveRowDragHandleAtPoint } from '../../../modules/row-drag/RowDragHandle'
import { resolvePositionAtIndex } from '../../../position/utils/resolvePositionAtIndex'
import { captureDragSnapshot } from '../intents/drag-drop/CaptureDragSnapshotIntent'
import {
  IPointerCoordinatePayload,
  IResolvedPagePoint
} from '../coordinates/PointerCoordinateTypes'

interface IStartRowDragActionPayload {
  evt: MouseEvent
  host: CanvasEvent
  pagePoint: IResolvedPagePoint
  coordinates: IPointerCoordinatePayload
}

export function startRowDragAction(
  payload: IStartRowDragActionPayload
): boolean {
  const { evt, host, pagePoint, coordinates } = payload
  const draw = host.getDraw()
  if (draw.isReadonly() || evt.button !== MouseEventButton.LEFT) {
    return false
  }

  const rowDragHandle = resolveRowDragHandleAtPoint({
    draw,
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: pagePoint.pageNo
  })
  if (!rowDragHandle) return false

  const coordinate = draw.getCoordinate()
  const rangeManager = draw.getComponents().range
  const session = host.getPointerSession()
  rangeManager.setRange(rowDragHandle.startIndex, rowDragHandle.endIndex)
  coordinate.setPositionContext({
    isTable: false,
    index: rowDragHandle.cursorIndex
  })
  const cursorPosition = resolvePositionAtIndex(draw, rowDragHandle.cursorIndex)
  if (cursorPosition) {
    coordinate.setCursorPosition(cursorPosition)
  }
  draw.render({
    curIndex: rowDragHandle.cursorIndex,
    isSetCursor: false,
    isCompute: false,
    isSubmitHistory: false,
    pageRenderScope: 'visible'
  })
  captureDragSnapshot(host, {
    dragSource: 'row-handle'
  })
  session.isAllowDrop = true
  session.isAllowSelection = false
  session.mouseDownStartPosition = {
    index: rowDragHandle.cursorIndex,
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: pagePoint.pageNo
  }
  session.mouseDownStartCoordinates = coordinates
  session.lastPointerCoordinates = coordinates
  return true
}
