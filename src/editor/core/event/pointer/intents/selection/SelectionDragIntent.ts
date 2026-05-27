import { CanvasEvent } from '../../../CanvasEvent'
import { resolveSelectionDragRange } from '../../../utils/resolveSelectionDragRange'
import { renderSelectionDrag } from '../../effects/PointerRenderEffect'
import { disposeTableTool } from '../../effects/TableToolEffect'

export function runSelectionDragIntent(payload: {
  host: CanvasEvent
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
  const hitTestResult = components.tableHitTestService.resolve({
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

  rangeManager.setRange(
    selectionUpdate.range.startIndex,
    selectionUpdate.range.endIndex,
    selectionUpdate.range.tableId,
    selectionUpdate.range.startTdIndex,
    selectionUpdate.range.endTdIndex,
    selectionUpdate.range.startTrIndex,
    selectionUpdate.range.endTrIndex
  )
  if (selectionUpdate.positionContext) {
    coordinate.setPositionContext(selectionUpdate.positionContext)
  }
  if (selectionUpdate.hasSelectionDrag) {
    disposeTableTool(draw)
  }

  const isCrossRowColSelection = !!(
    selectionUpdate.range.tableId &&
    selectionUpdate.range.startTdIndex !== undefined &&
    selectionUpdate.range.endTdIndex !== undefined &&
    selectionUpdate.range.startTrIndex !== undefined &&
    selectionUpdate.range.endTrIndex !== undefined
  )
  renderSelectionDrag({ draw, isCrossRowColSelection })
  session.lastPointerCoordinates = coordinates
  return true
}
