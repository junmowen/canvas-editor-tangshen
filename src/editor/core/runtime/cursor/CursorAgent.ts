import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { EventBusMap } from '../../../interface/EventBus'
import { Draw } from '../../draw/Draw'
import { EditorClipboardController } from '../../event/EditorClipboardController'
import { EditorInputController } from '../../event/EditorInputController'
import { EventBus } from '../../event/eventbus/EventBus'

export class CursorAgent {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器根容器，承载浮层、光标或交互节点。 */
  private container: HTMLDivElement
  private agentCursorDom: HTMLTextAreaElement
  private inputController: EditorInputController
  private clipboardController: EditorClipboardController
  /** 事件总线实例，用于发布和订阅编辑器内部事件。 */
  private eventBus: EventBus<EventBusMap>

  /** 初始化 CursorAgent 实例并注入运行依赖。 */
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

  /** 处理文本输入事件，把输入内容写入当前光标位置。 */
  private _input(evt: Event) {
    const data = (<InputEvent>evt).data || this.agentCursorDom.value
    if (data) {
      this.inputController.input(data)
    }
    if (this.eventBus.isSubscribe('input')) {
      this.eventBus.emit('input', evt)
    }
  }

  /** 处理粘贴操作，把剪贴板内容转换为编辑器元素。 */
  private _paste(evt: ClipboardEvent) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const clipboardData = evt.clipboardData
    if (!clipboardData) return
    this.clipboardController.pasteByEvent(evt)
    evt.preventDefault()
  }

  /** 处理输入法组合开始事件，暂停普通输入提交。 */
  private _compositionstart() {
    this.inputController.compositionstart()
  }

  /** 处理输入法组合结束事件，提交最终输入文本。 */
  private _compositionend(evt: CompositionEvent) {
    this.inputController.compositionend(evt)
  }
}
