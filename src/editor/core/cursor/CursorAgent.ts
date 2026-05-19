import { EDITOR_PREFIX } from '../../dataset/constant/Editor'
import { EventBusMap } from '../../interface/EventBus'
import { Draw } from '../draw/Draw'
import { EditorClipboardController } from '../event/EditorClipboardController'
import { EditorInputController } from '../event/EditorInputController'
import { EventBus } from '../event/eventbus/EventBus'

export class CursorAgent {
  private draw: Draw
  private container: HTMLDivElement
  private agentCursorDom: HTMLTextAreaElement
  private inputController: EditorInputController
  private clipboardController: EditorClipboardController
  private eventBus: EventBus<EventBusMap>

  constructor(
    draw: Draw,
    inputController: EditorInputController,
    clipboardController: EditorClipboardController
  ) {
    this.draw = draw
    this.container = draw.getPageCanvasHost().getContainer()
    this.inputController = inputController
    this.clipboardController = clipboardController
    this.eventBus = draw.getEventBus()
    // 代理光标绘制
    const agentCursorDom = document.createElement('textarea')
    agentCursorDom.autocomplete = 'off'
    agentCursorDom.classList.add(`${EDITOR_PREFIX}-inputarea`)
    agentCursorDom.innerText = ''
    this.container.append(agentCursorDom)
    this.agentCursorDom = agentCursorDom
    // 事件
    agentCursorDom.onkeydown = (evt: KeyboardEvent) => this._keyDown(evt)
    agentCursorDom.oninput = this._input.bind(this)
    agentCursorDom.onpaste = (evt: ClipboardEvent) => this._paste(evt)
    agentCursorDom.addEventListener(
      'compositionstart',
      this._compositionstart.bind(this)
    )
    agentCursorDom.addEventListener(
      'compositionend',
      this._compositionend.bind(this)
    )
  }

  public getAgentCursorDom(): HTMLTextAreaElement {
    return this.agentCursorDom
  }

  private _keyDown(evt: KeyboardEvent) {
    this.inputController.keydown(evt)
  }

  private _input(evt: Event) {
    const data = (<InputEvent>evt).data || this.agentCursorDom.value
    if (data) {
      this.inputController.input(data)
    }
    if (this.eventBus.isSubscribe('input')) {
      this.eventBus.emit('input', evt)
    }
  }

  private _paste(evt: ClipboardEvent) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const clipboardData = evt.clipboardData
    if (!clipboardData) return
    this.clipboardController.pasteByEvent(evt)
    evt.preventDefault()
  }

  private _compositionstart() {
    this.inputController.compositionstart()
  }

  private _compositionend(evt: CompositionEvent) {
    this.inputController.compositionend(evt)
  }
}
