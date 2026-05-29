import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { CanvasEvent } from '../../CanvasEvent'
import { runEnterIntent } from '../intents/EnterIntent'

export function runEnterAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (evt.key !== KeyMap.Enter) return false
  const draw = host.getDraw()
  draw.getTrackChange().endEditSession()
  runEnterIntent(evt, host)
  return true
}
