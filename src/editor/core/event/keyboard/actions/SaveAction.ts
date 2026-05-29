import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { isMod } from '../../../../utils/hotkey'
import { CanvasEvent } from '../../CanvasEvent'

export function runSaveAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (!isMod(evt) || evt.key.toLocaleLowerCase() !== KeyMap.S) return false
  const draw = host.getDraw()
  if (draw.isReadonly()) return true
  const listener = draw.getListener()
  if (listener.saved) {
    listener.saved(draw.getValue())
  }
  const eventBus = draw.getEventBus()
  if (eventBus.isSubscribe('saved')) {
    eventBus.emit('saved', draw.getValue())
  }
  evt.preventDefault()
  return true
}
