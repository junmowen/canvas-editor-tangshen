import {
  getIsClipboardContainFile,
  removeClipboardData
} from '../../../utils/clipboard'
import { pasteImageFile } from '../../modules/image/clipboard/pasteImageFile'
import { CanvasEvent } from '../CanvasEvent'
import { pasteHtml } from './pasteHtml'
import {
  canRunPaste,
  getClipboardImageType,
  getClipboardTextType,
  hasClipboardHtmlType,
  tryApplyEditorClipboardData
} from './pasteClipboardCommon'
import { pastePlainText } from './pastePlainText'

export function pasteByClipboardEvent(host: CanvasEvent, evt: ClipboardEvent) {
  const clipboardData = evt.clipboardData
  if (!clipboardData) return
  if (!canRunPaste(host, evt)) return
  if (!getIsClipboardContainFile(clipboardData)) {
    const clipboardText = clipboardData.getData('text')
    if (tryApplyEditorClipboardData(host, clipboardText)) return
  }
  removeClipboardData()
  let hasHTML = false
  for (let i = 0; i < clipboardData.items.length; i++) {
    if (hasClipboardHtmlType([clipboardData.items[i].type])) {
      hasHTML = true
      break
    }
  }
  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i]
    if (item.kind === 'string') {
      const textType = getClipboardTextType([item.type], hasHTML)
      if (textType === 'text/plain') {
        item.getAsString(plainText => {
          pastePlainText(host, plainText)
        })
        break
      }
      if (textType === 'text/html') {
        item.getAsString(htmlText => {
          pasteHtml(host, htmlText)
        })
        break
      }
    } else if (item.kind === 'file' && getClipboardImageType([item.type])) {
      const file = item.getAsFile()
      if (file) {
        pasteImageFile(host.getDraw(), file)
      }
    }
  }
}
