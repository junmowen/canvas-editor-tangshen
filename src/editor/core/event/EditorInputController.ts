import { ICopyOption } from '../../interface/Event'
import { CanvasEvent } from './CanvasEvent'
import { KeyboardController } from './KeyboardController'
import composition from './handlers/composition'
import { copy } from './handlers/copy'
import { cut } from './handlers/cut'
import { input } from './handlers/input'

export class EditorInputController {
  private keyboardController: KeyboardController

  constructor(private readonly host: CanvasEvent) {
    this.keyboardController = new KeyboardController(host)
  }

  public keydown(evt: KeyboardEvent) {
    this.keyboardController.keydown(evt)
  }

  public input(data: string) {
    input(data, this.host)
  }

  public cut() {
    cut(this.host)
  }

  public copy(options?: ICopyOption) {
    copy(this.host, options)
  }

  public compositionstart() {
    composition.compositionstart(this.host)
  }

  public compositionend(evt: CompositionEvent) {
    composition.compositionend(this.host, evt)
  }
}
