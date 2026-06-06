import { IElement } from '../../../interface/Element'
import { resolveOoxmlFormulaRun } from './OoxmlFormulaExportAdapter'

/** 文本 run 生成器，由主 package 注入，避免公式模块反向依赖整份 OOXML 打包文件。 */
export type TOoxmlTextRunFactory = (element: IElement) => string

/** 生成公式 OOXML，优先使用结构化公式派生片段；没有 AST 的输入按展示文本导出。 */
export function createOoxmlFormulaRun(
  element: IElement,
  createOoxmlTextRun: TOoxmlTextRunFactory
) {
  return resolveOoxmlFormulaRun(element, createOoxmlTextRun)
}
