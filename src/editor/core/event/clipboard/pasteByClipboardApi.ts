import { IPasteOption } from '../../../interface/Event'
import { removeClipboardData } from '../../../utils/clipboard'
import { CanvasEvent } from '../CanvasEvent'
import { pasteHtml } from './pasteHtml'
import { pasteImageFile } from './pasteImageFile'
import {
  canRunPaste,
  getClipboardImageType,
  getClipboardTextType,
  hasClipboardHtmlType,
  tryApplyEditorClipboardData
} from './pasteClipboardCommon'
import { pastePlainText } from './pastePlainText'

export async function pasteByClipboardApi(
  host: CanvasEvent,
  options?: IPasteOption
) {
  if (!canRunPaste(host)) return
  const clipboardText = await navigator.clipboard.readText()
  if (tryApplyEditorClipboardData(host, clipboardText)) return
  removeClipboardData()
  if (options?.isPlainText) {
    if (clipboardText) {
      pastePlainText(host, clipboardText)
    }
    return
  }
  const clipboardData = await navigator.clipboard.read()
  const isHTML = clipboardData.some(item => hasClipboardHtmlType(item.types))
  for (const item of clipboardData) {
    const textType = getClipboardTextType(item.types, isHTML)
    if (textType) {
      const textBlob = await item.getType(textType)
      const text = await textBlob.text()
      if (text) {
        if (textType === 'text/html') {
          pasteHtml(host, text)
        } else {
          pastePlainText(host, text)
        }
      }
      continue
    }
    const type = getClipboardImageType(item.types)
    if (type) {
      const imageBlob = await item.getType(type)
      pasteImageFile(host, imageBlob)
    }
  }
}
