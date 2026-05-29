import { CanvasEvent } from '../../CanvasEvent'
import { runKeyboardDeletionIntent } from '../intents/KeyboardDeletionIntent'

export function runDeletionAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  return runKeyboardDeletionIntent(evt, host)
}
