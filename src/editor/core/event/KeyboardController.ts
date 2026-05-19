import { EditorMode, EditorZone } from '../../dataset/enum/Editor'
import { KeyMap } from '../../dataset/enum/KeyMap'
import { isMod } from '../../utils/hotkey'
import { CanvasEvent } from './CanvasEvent'
import { runEnterIntent } from './keyboard/intents/EnterIntent'
import { runKeyboardNavigationIntent } from './keyboard/intents/KeyboardNavigationIntent'
import { runKeyboardDeletionIntent } from './keyboard/intents/KeyboardDeletionIntent'
import { runTabIntent } from './keyboard/intents/TabIntent'

export class KeyboardController {
  constructor(private readonly host: CanvasEvent) {}

  public keydown(evt: KeyboardEvent) {
    if (this.host.isComposing) return
    const draw = this.host.getDraw()
    if (runKeyboardDeletionIntent(evt, this.host)) {
      return
    }
    if (evt.key === KeyMap.Enter) {
      runEnterIntent(evt, this.host)
      return
    }
    if (runKeyboardNavigationIntent(evt, this.host)) {
      return
    }
    if (isMod(evt) && evt.key.toLocaleLowerCase() === KeyMap.Z) {
      if (draw.isReadonly() && draw.getMode() !== EditorMode.FORM) return
      draw.flushAsyncInsertTransaction('keyboard-undo')
      draw.getHistoryManager().undo()
      evt.preventDefault()
    } else if (isMod(evt) && evt.key.toLocaleLowerCase() === KeyMap.Y) {
      if (draw.isReadonly() && draw.getMode() !== EditorMode.FORM) return
      draw.flushAsyncInsertTransaction('keyboard-redo')
      draw.getHistoryManager().redo()
      evt.preventDefault()
    } else if (isMod(evt) && evt.key.toLocaleLowerCase() === KeyMap.C) {
      this.host.copy()
      evt.preventDefault()
    } else if (isMod(evt) && evt.key.toLocaleLowerCase() === KeyMap.X) {
      this.host.cut()
      evt.preventDefault()
    } else if (isMod(evt) && evt.key.toLocaleLowerCase() === KeyMap.A) {
      this.host.selectAll()
      evt.preventDefault()
    } else if (isMod(evt) && evt.key.toLocaleLowerCase() === KeyMap.S) {
      if (draw.isReadonly()) return
      const listener = draw.getListener()
      if (listener.saved) {
        listener.saved(draw.getValue())
      }
      const eventBus = draw.getEventBus()
      if (eventBus.isSubscribe('saved')) {
        eventBus.emit('saved', draw.getValue())
      }
      evt.preventDefault()
    } else if (evt.key === KeyMap.ESC) {
      this.host.clearPainterStyle()
      const zoneManager = draw.getZone()
      if (!zoneManager.isMainActive()) {
        zoneManager.setZone(EditorZone.MAIN)
      }
      evt.preventDefault()
    } else if (evt.key === KeyMap.TAB) {
      runTabIntent(evt, this.host)
    }
  }
}
