import { ICopyOption } from '../../interface/Event'
import { CanvasEvent } from './CanvasEvent'
import { KeyboardController } from './KeyboardController'
import { FastInputProcessor } from './input/FastInputProcessor'
import { copy } from './handlers/copy'
import { cut } from './handlers/cut'

/** inputcontroller选项，用于约束调用方可传入的可选配置。 */
export interface IInputControllerOption {
  isAsyncRender?: boolean
}

export class EditorInputController {
  private keyboardController: KeyboardController
  private fastInputProcessor: FastInputProcessor

  /** 初始化 EditorInputController 实例并注入运行依赖。 */
  constructor(private readonly host: CanvasEvent) {
    const draw = host.getDraw()
    this.keyboardController = new KeyboardController(host)
    this.fastInputProcessor = new FastInputProcessor(draw)
  }

  /** 处理键盘按下事件，执行快捷键、输入或控件拦截逻辑。 */
  public keydown(evt: KeyboardEvent) {
    this.keyboardController.keydown(evt)
  }

  /** 处理文本输入事件，把输入内容写入当前光标位置。 */
  public input(data: string) {
    this.fastInputProcessor.processInput(data)
  }

  /** 处理剪切操作，复制选区内容后删除原文档范围。 */
  public cut() {
    cut(this.host)
  }

  /** 处理复制操作，把当前选区内容写入剪贴板。 */
  public copy(options?: ICopyOption) {
    copy(this.host, options)
  }

  /** 处理输入法组合开始事件，暂停普通输入提交。 */
  public compositionstart() {
    this.host.isComposing = true
    this.fastInputProcessor.compositionStart()
  }

  /** 处理输入法组合结束事件，提交最终输入文本。 */
  public compositionend(evt: CompositionEvent) {
    this.host.isComposing = false
    this.fastInputProcessor.compositionEnd(evt.data)
    this.host.compositionInfo = this.fastInputProcessor.getCompositionInfo()
  }

  /** 销毁destroy相关资源，解除事件监听并释放持有对象。 */
  public destroy() {
    this.fastInputProcessor.clear()
  }
}
