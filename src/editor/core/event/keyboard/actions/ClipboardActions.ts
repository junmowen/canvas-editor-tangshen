import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { isMod } from '../../../../utils/hotkey'
import { CanvasEvent } from '../../CanvasEvent'

export function runCopyAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (!isMod(evt) || evt.key.toLocaleLowerCase() !== KeyMap.C) return false
  host.copy()
  evt.preventDefault()
  return true
}

export function runCutAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (!isMod(evt) || evt.key.toLocaleLowerCase() !== KeyMap.X) return false
  host.cut()
  evt.preventDefault()
  return true
}
