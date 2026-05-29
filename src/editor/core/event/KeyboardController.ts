import { CanvasEvent } from './CanvasEvent'
import { KEYBOARD_ACTIONS } from './keyboard/actions/KeyboardActions'

export class KeyboardController {
  /** 初始化 KeyboardController 实例并注入运行依赖。 */
  constructor(private readonly host: CanvasEvent) {}

  /** 处理键盘按下事件，执行快捷键、输入或控件拦截逻辑。 */
  public keydown(evt: KeyboardEvent) {
    if (this.host.isComposing) return
    for (const action of KEYBOARD_ACTIONS) {
      if (action(evt, this.host)) return
    }
  }
}
