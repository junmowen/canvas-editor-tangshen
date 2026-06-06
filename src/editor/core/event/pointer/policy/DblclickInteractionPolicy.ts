import { Draw } from '../../../draw/Draw'
import { ICurrentPosition } from '../../../../interface/Position'
import { renderImagePreviewForDblclick } from '../../../modules/image/interaction/handleImageSelectionStart'
import {
  resolveTableCellDblclickIntent,
  resolveTableCellDblclickSelectionRange
} from '../../../modules/table/interaction/resolveTableCellDblclickIntent'
import { resolveTableAwarePointerIndex } from '../../../modules/table/selection/resolveTablePointerIndex'
import { resolvePositionAtIndex } from '../../../position/utils/resolvePositionAtIndex'
import { CanvasEvent } from '../../CanvasEvent'
import { IResolvedPagePoint } from '../coordinates/PointerCoordinateTypes'
import { renderSelectionRange } from '../effects/PointerRenderEffect'
import { resolveWordRangeIntent } from '../intents/selection/SelectionWordRangeIntent'
import { applyPointerPositionContext } from '../utils/applyPointerPositionContext'

export function applyDblclickPositionContext(payload: {
  draw: Draw
  positionContext: ICurrentPosition
  hitTargetIndex?: number
  absoluteIndex?: number
}): void {
  const { draw, positionContext, hitTargetIndex, absoluteIndex } = payload
  applyPointerPositionContext(draw.getCoordinate(), positionContext)
  const cursorIndex =
    hitTargetIndex ?? absoluteIndex ?? resolveTableAwarePointerIndex(positionContext)
  if (positionContext.cursorPosition) {
    draw.getCoordinate().setCursorPosition(positionContext.cursorPosition)
  } else if (~cursorIndex) {
    draw.getCoordinate().setCursorPosition(resolvePositionAtIndex(draw, cursorIndex))
  }
}

export function tryRenderDblclickImagePreview(payload: {
  draw: Draw
  positionContext: ICurrentPosition
}): boolean {
  return renderImagePreviewForDblclick(payload)
}

export function tryHandlePagingZoneDblclick(payload: {
  draw: Draw
  pagePoint: IResolvedPagePoint
  positionContext: ICurrentPosition
}): boolean {
  const { draw, pagePoint, positionContext } = payload
  if (!draw.getIsPagingMode() || ~positionContext.index! || !positionContext.zone) {
    return false
  }
  draw.getZone().setZone(positionContext.zone, Number(pagePoint.pageIndex))
  draw.clearSideEffect()
  draw.getCoordinate().setPositionContext({ isTable: false })
  return true
}

export function shouldSuppressControlDirectDblclick(
  positionContext: ICurrentPosition
): boolean {
  return Boolean(
    (positionContext.isCheckbox || positionContext.isRadio) &&
      positionContext.isDirectHit
  )
}

export function tryHandleTableCellDblclick(payload: {
  host: CanvasEvent
  draw: Draw
  pagePoint: IResolvedPagePoint
  positionContext: ICurrentPosition
}): boolean {
  const { host, draw, pagePoint, positionContext } = payload
  if (!positionContext.isTable) return false
  const session = host.getPointerSession()
  if (session.multiClick.tableCellClickResetTimer !== null) {
    window.clearTimeout(session.multiClick.tableCellClickResetTimer)
    session.multiClick.tableCellClickResetTimer = null
  }
  const tableDblclick = resolveTableCellDblclickIntent({
    draw,
    session,
    positionContext,
    pageNo: Number(pagePoint.pageIndex)
  })
  if (tableDblclick.count === 1) {
    const wordRange = resolveWordRangeIntent(host)
    if (wordRange) {
      renderSelectionRange({
        draw,
        startIndex: wordRange.startIndex,
        endIndex: wordRange.endIndex
      })
    }
    return true
  }
  const selectionRange = resolveTableCellDblclickSelectionRange({
    draw,
    tableDblclick
  })
  if (!selectionRange) return true
  renderSelectionRange({
    draw,
    startIndex: selectionRange.startIndex,
    endIndex: selectionRange.endIndex,
    tableId: selectionRange.tableId
  })
  return true
}

export function renderDblclickWordSelection(host: CanvasEvent, draw: Draw): void {
  const wordRange = resolveWordRangeIntent(host)
  if (!wordRange) return
  renderSelectionRange({
    draw,
    startIndex: wordRange.startIndex,
    endIndex: wordRange.endIndex
  })
}
