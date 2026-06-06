import { CanvasEvent } from '../CanvasEvent'
import { debugDblclick } from '../debug/dblclick'
import { resolvePointerHitIntent } from '../pointer/intents/ResolvePointerHitIntent'
import {
  applyDblclickPositionContext,
  renderDblclickWordSelection,
  shouldSuppressControlDirectDblclick,
  tryHandlePagingZoneDblclick,
  tryHandleTableCellDblclick,
  tryRenderDblclickImagePreview
} from '../pointer/policy/DblclickInteractionPolicy'

/**
 * 处理双击事件。
 *
 * 双击会根据命中结果决定是图片预览、表格单元格选择还是词选区展开。
 */
export function dblclick(host: CanvasEvent, evt: MouseEvent): void {
  debugDblclick(evt, host)
  const draw = host.getDraw()
  const hit = resolvePointerHitIntent({ host, evt })
  if (!hit) return

  const { pagePoint, hitTestResult } = hit
  const { positionResult: positionContext, boundary } = hitTestResult
  if (!positionContext) return

  applyDblclickPositionContext({
    draw,
    positionContext,
    hitTargetIndex: boundary?.hitTargetIndex,
    absoluteIndex: boundary?.absoluteIndex
  })
  if (tryRenderDblclickImagePreview({ draw, positionContext })) return
  if (tryHandlePagingZoneDblclick({ draw, pagePoint, positionContext })) return
  if (shouldSuppressControlDirectDblclick(positionContext)) return
  if (tryHandleTableCellDblclick({ host, draw, pagePoint, positionContext })) return
  renderDblclickWordSelection(host, draw)
}
