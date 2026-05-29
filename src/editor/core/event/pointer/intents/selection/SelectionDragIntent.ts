import { CanvasEvent } from '../../../CanvasEvent'
import { resolveSelectionDragRange } from '../../../../range/selection/resolveSelectionDragRange'
import { resolveTablePointerHit } from '../../../../modules/table/hittest/resolveTablePointerHit'
import { disposeTableTool } from '../../../../modules/table/interaction/TableToolEffect'
import { isTableCrossRowColSelectionRange } from '../../../../modules/table/selection/resolveTablePointerSelection'
import { renderSelectionDrag } from '../../effects/PointerRenderEffect'

export function runSelectionDragIntent(payload: {
  /** 宿主容器节点，用于承载编辑器或渲染表面。 */
  host: CanvasEvent
  /** 原始 DOM 事件对象，用于读取指针、键盘或剪贴板信息。 */
  evt: MouseEvent
}): boolean {
  const { host, evt } = payload
  const draw = host.getDraw()
  const components = draw.getComponents()
  const session = host.getPointerSession()
  const coordinates = draw.getCoordinate().getPointerCoordinates(evt, session.lastPointerCoordinates)
  const pagePoint = coordinates.page
  if (!session.isAllowSelection || !session.mouseDownStartPosition || !pagePoint) {
    session.lastPointerCoordinates = coordinates
    return false
  }

  draw.setPageNo(pagePoint.pageNo)
  const coordinate = draw.getCoordinate()
  const rangeManager = components.range
  const hitTestResult = resolveTablePointerHit({
    draw,
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: pagePoint.pageNo,
    pagePoint,
    startPosition: session.mouseDownStartPosition
  })
  const { positionResult, boundary } = hitTestResult
  if (!boundary) {
    session.lastPointerCoordinates = coordinates
    return true
  }

  const selectionUpdate = resolveSelectionDragRange({
    draw,
    startPosition: session.mouseDownStartPosition,
    positionResult: positionResult!,
    pointerX: pagePoint.x,
    pointerY: pagePoint.y,
    endBoundaryIndex: boundary.absoluteIndex,
    endHitTargetIndex: boundary.hitTargetIndex
  })
  if (!selectionUpdate) {
    session.lastPointerCoordinates = coordinates
    return true
  }

  rangeManager.replaceRange(selectionUpdate.range)
  if (selectionUpdate.positionContext) {
    coordinate.setPositionContext(selectionUpdate.positionContext)
  }
  if (selectionUpdate.hasSelectionDrag) {
    disposeTableTool(draw)
  }

  const isCrossRowColSelection = isTableCrossRowColSelectionRange(
    selectionUpdate.range
  )
  renderSelectionDrag({ draw, isCrossRowColSelection })
  session.lastPointerCoordinates = coordinates
  return true
}
