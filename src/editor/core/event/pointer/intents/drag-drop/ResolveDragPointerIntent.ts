import { CanvasEvent } from '../../../CanvasEvent'
import { resolveTablePointerHit } from '../../../../modules/table/hittest/resolveTablePointerHit'
import { applyPointerPositionContext } from '../../utils/applyPointerPositionContext'

export function resolveDragPointerIntent(payload: {
  /** 宿主容器节点，用于承载编辑器或渲染表面。 */
  host: CanvasEvent
  /** 原始 DOM 事件对象，用于读取指针、键盘或剪贴板信息。 */
  evt: DragEvent | MouseEvent
}): { positionResult: any; coordinates: any } | null {
  const { host, evt } = payload
  const draw = host.getDraw()
  const coordinate = draw.getCoordinate()
  const session = host.getPointerSession()
  const coordinates = draw.getCoordinate().getPointerCoordinates(evt, session.lastPointerCoordinates)
  const pagePoint = coordinates.page
  if (!pagePoint) return null
  draw.setPageNo(pagePoint.pageNo)
  const positionResult = resolveTablePointerHit({
    draw,
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: pagePoint.pageNo,
    pagePoint,
    startPosition: null
  }).positionResult
  if (!positionResult) return null
  applyPointerPositionContext(coordinate, positionResult)
  return {
    positionResult,
    coordinates
  }
}
