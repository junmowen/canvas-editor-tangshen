import Editor from '..'

/** pluginfunction类型，用于约束公开 API中传递的数据结构。 */
export type PluginFunction<Options> = (editor: Editor, options?: Options) => any

/** useplugin类型，用于约束公开 API中传递的数据结构。 */
export type UsePlugin = <Options>(
  pluginFunction: PluginFunction<Options>,
  options?: Options
) => void
