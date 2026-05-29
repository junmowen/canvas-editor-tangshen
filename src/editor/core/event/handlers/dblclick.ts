import { CanvasEvent } from '../CanvasEvent'
import { debugDblclick } from '../debug/dblclick'
import { applyPointerPositionContext } from '../pointer/utils/applyPointerPositionContext'
import { resolvePointerHitIntent } from '../pointer/intents/ResolvePointerHitIntent'
import { resolveWordRangeIntent } from '../pointer/intents/selection/SelectionWordRangeIntent'
import {
  resolveTableCellDblclickIntent,
  resolveTableCellDblclickSelectionRange
} from '../../modules/table/interaction/resolveTableCellDblclickIntent'
import { renderSelectionRange } from '../pointer/effects/PointerRenderEffect'
import { resolvePositionAtIndex } from '../../position/utils/resolvePositionAtIndex'
import { resolveTableAwarePointerIndex } from '../../modules/table/selection/resolveTablePointerIndex'
import { renderImagePreviewForDblclick } from '../../modules/image/interaction/handleImageSelectionStart'

/**
 * 处理双击事件。
 *
 * 双击会根据命中结果决定是图片预览、表格单元格选择还是词选区展开。
 */
export function dblclick(host: CanvasEvent, evt: MouseEvent): void {
  debugDblclick(evt, host)
  const draw = host.getDraw()
  const session = host.getPointerSession()
  const hit = resolvePointerHitIntent({ host, evt })
  if (!hit) return

  const { pagePoint, hitTestResult } = hit
  const { positionResult: positionContext, boundary } = hitTestResult
  if (!positionContext) return

  applyPointerPositionContext(draw.getCoordinate(), positionContext)
  const cursorIndex =
    boundary?.hitTargetIndex ??
    boundary?.absoluteIndex ??
    resolveTableAwarePointerIndex(positionContext)
  if (positionContext.cursorPosition) {
    draw.getCoordinate().setCursorPosition(positionContext.cursorPosition)
  } else if (~cursorIndex) {
    draw.getCoordinate().setCursorPosition(resolvePositionAtIndex(draw, cursorIndex))
  }
  if (renderImagePreviewForDblclick({ draw, positionContext })) {
    return
  }
  if (draw.getIsPagingMode() && !~positionContext.index && positionContext.zone) {
    draw.getZone().setZone(positionContext.zone)
    draw.clearSideEffect()
    draw.getCoordinate().setPositionContext({ isTable: false })
    return
  }
  if (
    (positionContext.isCheckbox || positionContext.isRadio) &&
    positionContext.isDirectHit
  ) {
    return
  }
  if (positionContext.isTable) {
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
      return
    }
    const selectionRange = resolveTableCellDblclickSelectionRange({
      draw,
      tableDblclick
    })
    if (!selectionRange) return
    renderSelectionRange({
      draw,
      startIndex: selectionRange.startIndex,
      endIndex: selectionRange.endIndex,
      tableId: selectionRange.tableId
    })
    return
  }

  const wordRange = resolveWordRangeIntent(host)
  if (!wordRange) return
  renderSelectionRange({
    draw,
    startIndex: wordRange.startIndex,
    endIndex: wordRange.endIndex
  })
}
