import { getElementListByHTML } from '../../../utils/elementDom'
import { isEditorDisabled } from '../../shared/utils/editorState'
import { CanvasEvent } from '../CanvasEvent'
import { applyPasteElements } from './applyPasteElements'

export function pasteHtml(host: CanvasEvent, htmlText: string) {
  const draw = host.getDraw()
  if (isEditorDisabled(draw)) return
  const elementList = getElementListByHTML(htmlText, {
    innerWidth: draw.getOriginalInnerWidth()
  })
  applyPasteElements(host, elementList)
}
