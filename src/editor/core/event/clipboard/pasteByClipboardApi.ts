import { IPasteOption } from '../../../interface/Event'
import { getClipboardData, removeClipboardData } from '../../../utils/clipboard'
import { IOverrideResult } from '../../override/Override'
import { CanvasEvent } from '../CanvasEvent'
import { applyPasteElements } from './applyPasteElements'
import { pasteHtml } from './pasteHtml'
import { pasteImageFile } from './pasteImageFile'

export async function pasteByClipboardApi(
  host: CanvasEvent,
  options?: IPasteOption
) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  const { paste } = draw.getOverride()
  if (paste) {
    const overrideResult = paste()
    if ((<IOverrideResult>overrideResult)?.preventDefault !== false) return
  }
  const clipboardText = await navigator.clipboard.readText()
  const editorClipboardData = getClipboardData()
  if (clipboardText === editorClipboardData?.text) {
    applyPasteElements(host, editorClipboardData.elementList)
    return
  }
  removeClipboardData()
  if (options?.isPlainText) {
    if (clipboardText) {
      host.input(clipboardText)
    }
    return
  }
  const clipboardData = await navigator.clipboard.read()
  let isHTML = false
  for (const item of clipboardData) {
    if (item.types.includes('text/html')) {
      isHTML = true
      break
    }
  }
  for (const item of clipboardData) {
    if (item.types.includes('text/plain') && !isHTML) {
      const textBlob = await item.getType('text/plain')
      const text = await textBlob.text()
      if (text) {
        host.input(text)
      }
    } else if (item.types.includes('text/html') && isHTML) {
      const htmlTextBlob = await item.getType('text/html')
      const htmlText = await htmlTextBlob.text()
      if (htmlText) {
        pasteHtml(host, htmlText)
      }
    } else if (item.types.some(type => type.startsWith('image/'))) {
      const type = item.types.find(type => type.startsWith('image/'))!
      const imageBlob = await item.getType(type)
      pasteImageFile(host, imageBlob)
    }
  }
}
