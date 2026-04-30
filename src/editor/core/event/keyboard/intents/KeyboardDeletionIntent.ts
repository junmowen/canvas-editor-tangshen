import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { CanvasEvent } from '../../CanvasEvent'
import { runBackspaceIntent } from './BackspaceIntent'
import { runDeleteIntent } from './DeleteIntent'

export function runKeyboardDeletionIntent(
  evt: KeyboardEvent,
  host: CanvasEvent
) {
  if (evt.key === KeyMap.Backspace) {
    runBackspaceIntent(evt, host)
    return true
  }
  if (evt.key === KeyMap.Delete) {
    runDeleteIntent(evt, host)
    return true
  }
  return false
}
