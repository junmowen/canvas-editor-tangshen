import { normalizeLineBreak } from '../../../utils'
import { getClipboardData } from '../../../utils/clipboard'
import { IOverrideResult } from '../../extension/override/Override'
import { isEditorDisabled } from '../../shared/utils/editorState'
import { CanvasEvent } from '../CanvasEvent'
import { applyPasteElements } from './applyPasteElements'

/** 判断当前上下文能否执行 Run Paste。 */
export function canRunPaste(host: CanvasEvent, evt?: ClipboardEvent): boolean {
  const draw = host.getDraw()
  if (isEditorDisabled(draw)) return false
  const { paste } = draw.getOverride()
  if (!paste) return true
  const overrideResult = paste(evt)
  return (<IOverrideResult>overrideResult)?.preventDefault === false
}

/** 尝试执行 Apply Editor Clipboard Data，失败时保持现有状态。 */
export function tryApplyEditorClipboardData(
  host: CanvasEvent,
  clipboardText: string
): boolean {
  const editorClipboardData = getClipboardData()
  if (
    editorClipboardData &&
    normalizeLineBreak(clipboardText) ===
      normalizeLineBreak(editorClipboardData.text)
  ) {
    applyPasteElements(host, editorClipboardData.elementList)
    return true
  }
  return false
}

export function hasClipboardHtmlType(types: Iterable<string>): boolean {
  for (const type of types) {
    if (type === 'text/html') return true
  }
  return false
}

export function getClipboardTextType(
  types: Iterable<string>,
  preferHtml: boolean
): 'text/html' | 'text/plain' | null {
  const typeSet = new Set(types)
  if (preferHtml && typeSet.has('text/html')) return 'text/html'
  if (!preferHtml && typeSet.has('text/plain')) return 'text/plain'
  return null
}

export function getClipboardImageType(types: Iterable<string>): string | null {
  for (const type of types) {
    if (type.startsWith('image/')) return type
  }
  return null
}
