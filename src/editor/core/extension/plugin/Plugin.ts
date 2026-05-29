import Editor from '../../..'
import { PluginFunction } from '../../../interface/Plugin'

export class Plugin {
  /** 当前编辑器实例，供插件读取命令、监听器和注册能力。 */
  private editor: Editor

  /** 初始化 Plugin 实例并注入运行依赖。 */
  constructor(editor: Editor) {
    this.editor = editor
  }

  public use<Options>(
    pluginFunction: PluginFunction<Options>,
    options?: Options
  ) {
    pluginFunction(this.editor, options)
  }
}
