import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { isMod } from '../../../../utils/hotkey'
import { CanvasEvent } from '../../CanvasEvent'

export function runSelectAllAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (!isMod(evt) || evt.key.toLocaleLowerCase() !== KeyMap.A) return false
  host.selectAll()
  evt.preventDefault()
  return true
}
