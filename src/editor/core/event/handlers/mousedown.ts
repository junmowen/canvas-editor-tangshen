import { MouseEventButton } from '../../../dataset/enum/Event'
import { TEXTLIKE_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { deepClone } from '../../../utils'
import { CanvasEvent } from '../CanvasEvent'
import { captureDragSnapshot } from '../pointer/intents/drag-drop/CaptureDragSnapshotIntent'
import { applyPointerPositionContext } from '../pointer/utils/applyPointerPositionContext'
import { resolveSelectionStartState } from '../utils/resolveSelectionStartState'
import { runSelectionStartIntent } from '../pointer/intents/selection/SelectionStartIntent'

/**
 * 处理鼠标按下事件。
 *
 * 处理范围选择、控件点击、表格操作、图片拖拽、超链接点击等逻辑。
 *
 * @param evt - 鼠标事件
 * @param host - Canvas 事件主机
 */
export function mousedown(evt: MouseEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  const session = host.getPointerSession()
  const isReadonly = draw.isReadonly()
  const rangeManager = components.range
  const position = components.position
  const range = rangeManager.getEditBoundaryRange()
  const coordinates = draw.getPointerCoordinates(evt, session.lastPointerCoordinates)
  const pagePoint = coordinates.page
  const selectedElementList = rangeManager.getSelectionElementList() || []
  const isPureTextSelection =
    !!selectedElementList.length &&
    selectedElementList.every(
      element =>
        (!element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)) &&
        !element.controlId
    )

  if (
    evt.button === MouseEventButton.RIGHT &&
    (range.isCrossRowCol || !rangeManager.getIsCollapsed())
  ) {
    session.lastPointerCoordinates = coordinates
    return
  }

  if (
    !session.isAllowDrag &&
    !isReadonly &&
    range.startIndex !== range.endIndex &&
    !isPureTextSelection
  ) {
    const isPointInRange = pagePoint
      ? rangeManager.getIsPointInRange(pagePoint.x, pagePoint.y)
      : false
    if (isPointInRange) {
      captureDragSnapshot(host)
      session.lastPointerCoordinates = coordinates
      return
    }
  }

  if (!pagePoint) {
    session.lastPointerCoordinates = coordinates
    return
  }
  draw.setPageNo(pagePoint.pageNo)

  session.isAllowSelection = true
  const oldPositionContext = deepClone(position.getPositionContext())
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

  applyPointerPositionContext(position, positionResult)
  runSelectionStartIntent({
    host,
    evt,
    oldPositionContextTdId: oldPositionContext.tdId,
    isReadonly,
    positionResult
  })
}
