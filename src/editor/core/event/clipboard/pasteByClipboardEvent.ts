import { IOverrideResult } from '../../override/Override'
import { getClipboardData, getIsClipboardContainFile, removeClipboardData } from '../../../utils/clipboard'
import { normalizeLineBreak } from '../../../utils'
import { CanvasEvent } from '../CanvasEvent'
import { applyPasteElements } from './applyPasteElements'
import { pasteHtml } from './pasteHtml'
import { pasteImageFile } from './pasteImageFile'

export function pasteByClipboardEvent(host: CanvasEvent, evt: ClipboardEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  const clipboardData = evt.clipboardData
  if (!clipboardData) return
  const { paste } = draw.getOverride()
  if (paste) {
    const overrideResult = paste(evt)
    if ((<IOverrideResult>overrideResult)?.preventDefault !== false) return
  }
  if (!getIsClipboardContainFile(clipboardData)) {
    const clipboardText = clipboardData.getData('text')
    const editorClipboardData = getClipboardData()
    if (
      editorClipboardData &&
      normalizeLineBreak(clipboardText) ===
        normalizeLineBreak(editorClipboardData.text)
    ) {
      applyPasteElements(host, editorClipboardData.elementList)
      return
    }
  }
  removeClipboardData()
  let isHTML = false
  for (let i = 0; i < clipboardData.items.length; i++) {
    if (clipboardData.items[i].type === 'text/html') {
      isHTML = true
      break
    }
  }
  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i]
    if (item.kind === 'string') {
      if (item.type === 'text/plain' && !isHTML) {
        item.getAsString(plainText => {
          host.input(plainText)
        })
        break
      }
      if (item.type === 'text/html' && isHTML) {
        item.getAsString(htmlText => {
          pasteHtml(host, htmlText)
        })
        break
      }
    } else if (item.kind === 'file' && item.type.includes('image')) {
      const file = item.getAsFile()
      if (file) {
        pasteImageFile(host, file)
      }
    }
  }
}
