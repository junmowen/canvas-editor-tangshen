import { resolveParagraphSelectionRange } from '../../../../modules/paragraph/selection/resolveParagraphSelectionRange'
import { CanvasEvent } from '../../../CanvasEvent'

export function resolveParagraphSelectionIntent(host: CanvasEvent) {
  const draw = host.getDraw()
  const cursorPosition = draw.getCoordinate().getCursorPosition()
  if (!cursorPosition) return null
  const { index } = cursorPosition
  const elementList = draw.getObjectResolver().getElementList()
  return resolveParagraphSelectionRange({ elementList, index })
}
