import { CanvasEvent } from '../CanvasEvent'
import { resolvePointerHitIntent } from '../pointer/intents/ResolvePointerHitIntent'
import { resolveParagraphSelectionIntent } from '../pointer/intents/selection/ParagraphSelectionIntent'
import { renderSelectionRange } from '../pointer/effects/PointerRenderEffect'

/**
 * 处理三连击事件。
 *
 * 三连击只在文本区域扩展整段选区，不处理表格单元格。
 */
export function threeClick(host: CanvasEvent, evt: MouseEvent): void {
  const draw = host.getDraw()
  const hit = resolvePointerHitIntent({ host, evt })
  if (!hit || hit.hitTestResult.positionResult?.isTable) return

  if (draw.getControl().selectAllValue()) {
    return
  }

  const paragraphRange = resolveParagraphSelectionIntent(host)
  if (!paragraphRange) return

  renderSelectionRange({
    draw,
    startIndex: paragraphRange.startIndex,
    endIndex: paragraphRange.endIndex
  })
}
