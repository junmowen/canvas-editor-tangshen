import { ICopyOption } from '../../interface/Event'
import { CanvasEvent } from './CanvasEvent'
import { KeyboardController } from './KeyboardController'
import { FastInputProcessor } from './input/FastInputProcessor'
import { copy } from './handlers/copy'
import { cut } from './handlers/cut'

export interface IInputControllerOption {
  isAsyncRender?: boolean
}

export class EditorInputController {
  private keyboardController: KeyboardController
  private fastInputProcessor: FastInputProcessor

  constructor(private readonly host: CanvasEvent) {
    const draw = host.getDraw()
    this.keyboardController = new KeyboardController(host)
    this.fastInputProcessor = new FastInputProcessor(draw)
  }

  public keydown(evt: KeyboardEvent) {
    this.keyboardController.keydown(evt)
  }

  public input(data: string) {
    this.fastInputProcessor.processInput(data)
  }

  public cut() {
    cut(this.host)
  }

  public copy(options?: ICopyOption) {
    copy(this.host, options)
  }

  public compositionstart() {
    this.host.isComposing = true
    this.fastInputProcessor.compositionStart()
  }

  public compositionend(evt: CompositionEvent) {
    this.host.isComposing = false
    this.fastInputProcessor.compositionEnd(evt.data)
    this.host.compositionInfo = this.fastInputProcessor.getCompositionInfo()
  }

  public destroy() {
    this.fastInputProcessor.clear()
  }
}
