import { CanvasEvent } from '../../../CanvasEvent'
import { applyPointerPositionContext } from '../../utils/applyPointerPositionContext'

export function resolveDragPointerIntent(payload: {
  host: CanvasEvent
  evt: DragEvent | MouseEvent
}): { positionResult: any; coordinates: any } | null {
  const { host, evt } = payload
  const draw = host.getDraw()
  const components = draw.getComponents()
  const position = components.position
  const session = host.getPointerSession()
  const coordinates = draw.getPointerCoordinates(evt, session.lastPointerCoordinates)
  const pagePoint = coordinates.page
  if (!pagePoint) return null
  draw.setPageNo(pagePoint.pageNo)
  const positionResult = components.tableHitTestService.resolve({
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: pagePoint.pageNo,
    pagePoint,
    startPosition: null
  }).positionResult
  if (!positionResult) return null
  applyPointerPositionContext(position, positionResult)
  return {
    positionResult,
    coordinates
  }
}
