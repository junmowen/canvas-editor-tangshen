import { CanvasEvent } from '../../CanvasEvent'

export type KeyboardAction = (
  evt: KeyboardEvent,
  host: CanvasEvent
) => boolean
