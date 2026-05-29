import { EditorMode } from '../../../../dataset/enum/Editor'
import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { isMod } from '../../../../utils/hotkey'
import { CanvasEvent } from '../../CanvasEvent'

export function runRedoAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (!isMod(evt) || evt.key.toLocaleLowerCase() !== KeyMap.Y) return false
  const draw = host.getDraw()
  if (draw.isReadonly() && draw.getMode() !== EditorMode.FORM) return true
  draw.getTrackChange().endEditSession()
  draw.flushAsyncInsertTransaction('keyboard-redo')
  draw.getHistoryManager().redo()
  evt.preventDefault()
  return true
}
