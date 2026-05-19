import { ZERO } from '../../../dataset/constant/Common'
import { IElement } from '../../../interface/Element'
import { splitText } from '../../../utils'
import { CanvasEvent } from '../CanvasEvent'
import { applyPasteElements } from './applyPasteElements'

const LARGE_PLAIN_TEXT_PASTE_THRESHOLD = 1000

export function pastePlainText(host: CanvasEvent, plainText: string) {
  if (!plainText) {
    return
  }
  if (plainText.length <= LARGE_PLAIN_TEXT_PASTE_THRESHOLD) {
    host.input(plainText)
    return
  }
  applyPasteElements(host, createPlainTextElementList(plainText))
}

function createPlainTextElementList(plainText: string): IElement[] {
  return splitText(plainText.replace(/\r\n|\r/g, '\n')).map(value => ({
    value: value === '\n' ? ZERO : value
  }))
}
