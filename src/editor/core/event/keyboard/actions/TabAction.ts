import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { CanvasEvent } from '../../CanvasEvent'
import { runTabIntent } from '../intents/TabIntent'

export function runTabAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (evt.key !== KeyMap.TAB) return false
  host.getDraw().getTrackChange().endEditSession()
  runTabIntent(evt, host)
  return true
}
