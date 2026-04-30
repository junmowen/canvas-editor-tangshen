import { getElementListByHTML } from '../../../utils/element'
import { CanvasEvent } from '../CanvasEvent'
import { applyPasteElements } from './applyPasteElements'

export function pasteHtml(host: CanvasEvent, htmlText: string) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  const elementList = getElementListByHTML(htmlText, {
    innerWidth: draw.getOriginalInnerWidth()
  })
  applyPasteElements(host, elementList)
}
