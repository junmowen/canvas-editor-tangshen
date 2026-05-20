import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { CanvasEvent } from '../../CanvasEvent'
import { runHorizontalMove } from '../shared/horizontalMove'
import { runLineBoundaryNavigationIntent } from './LineBoundaryNavigationIntent'
import { runVerticalNavigationIntent } from './VerticalNavigationIntent'

export function runKeyboardNavigationIntent(
  evt: KeyboardEvent,
  host: CanvasEvent
) {
  if (evt.key === KeyMap.Left) {
    runHorizontalMove(evt, host, 'prev')
    return true
  }
  if (evt.key === KeyMap.Right) {
    runHorizontalMove(evt, host, 'next')
    return true
  }
  if (evt.key === KeyMap.Up || evt.key === KeyMap.Down) {
    runVerticalNavigationIntent(evt, host)
    return true
  }
  if (evt.key === KeyMap.Home || evt.key === KeyMap.End) {
    runLineBoundaryNavigationIntent(evt, host)
    return true
  }
  return false
}
