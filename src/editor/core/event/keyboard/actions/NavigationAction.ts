import { CanvasEvent } from '../../CanvasEvent'
import { runKeyboardNavigationIntent } from '../intents/KeyboardNavigationIntent'

export function runNavigationAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (!runKeyboardNavigationIntent(evt, host)) return false
  host.getDraw().getTrackChange().endEditSession()
  return true
}
