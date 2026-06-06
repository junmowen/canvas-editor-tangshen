import { IPointerSession } from '../PointerSession'
import { CanvasEvent } from '../../CanvasEvent'

/** 判断 mouseup 后是否需要重新走一次 mousedown 来恢复拖拽状态。 */
export function shouldReplayMousedownAfterUncommittedDrag(
  session: IPointerSession
) {
  if (!session.isAllowDrag) {
    return false
  }
  const range = session.dragSnapshot.range
  return Boolean(range && range.startIndex !== range.endIndex)
}

export function replayMousedownAfterUncommittedDrag(payload: {
  host: CanvasEvent
  evt: MouseEvent
}): void {
  const { host, evt } = payload
  if (shouldReplayMousedownAfterUncommittedDrag(host.getPointerSession())) {
    host.mousedown(evt)
  }
}
