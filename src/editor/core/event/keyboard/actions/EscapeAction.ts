import { EditorZone } from '../../../../dataset/enum/Editor'
import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { CanvasEvent } from '../../CanvasEvent'

export function runEscapeAction(
  evt: KeyboardEvent,
  host: CanvasEvent
): boolean {
  if (evt.key !== KeyMap.ESC) return false
  const draw = host.getDraw()
  draw.getTrackChange().endEditSession()
  host.clearPainterStyle()
  const zoneManager = draw.getZone()
  if (!zoneManager.isMainActive()) {
    zoneManager.setZone(EditorZone.MAIN)
  }
  evt.preventDefault()
  return true
}
