import { IElement } from '../../../interface/Element'
import { completeFormulaDerivedFormats } from '../../modules/formula/model/FormulaSerializer'
import { createOoxmlFormulaTextRunElement } from './OoxmlFormulaTextAdapter'
import type { TOoxmlTextRunFactory } from './OoxmlFormulaExport'

/** 公式导出派生缓存上限，避免大文档重复公式反复构建 AST/OOXML。 */
const OOXML_FORMULA_EXPORT_CACHE_LIMIT = 512

/** 模块级 LRU 缓存，只缓存最终 OOXML 字符串，不回写编辑器公式模型。 */
const ooxmlFormulaExportCache = new Map<string, string>()

/** 从导出缓存读取 OOXML，同时刷新 LRU 顺序。 */
function getCachedOoxmlFormula(key: string) {
  const value = ooxmlFormulaExportCache.get(key)
  if (value === undefined) return undefined
  ooxmlFormulaExportCache.delete(key)
  ooxmlFormulaExportCache.set(key, value)
  return value
}

/** 写入导出缓存，超过上限时淘汰最早使用的公式。 */
function setCachedOoxmlFormula(key: string, value: string) {
  ooxmlFormulaExportCache.set(key, value)
  if (ooxmlFormulaExportCache.size > OOXML_FORMULA_EXPORT_CACHE_LIMIT) {
    const oldestKey = ooxmlFormulaExportCache.keys().next().value
    if (oldestKey) {
      ooxmlFormulaExportCache.delete(oldestKey)
    }
  }
  return value
}

/** 生成公式导出缓存键。 */
function createOoxmlFormulaExportCacheKey(element: IElement) {
  if (element.formula?.ast) {
    return `ast:${JSON.stringify(element.formula.ast)}`
  }
  return ''
}

/** 按公式模型状态选择 OOXML 输出，缺少结构化模型时按展示文本兜底。 */
export function resolveOoxmlFormulaRun(
  element: IElement,
  createOoxmlTextRun: TOoxmlTextRunFactory
) {
  if (element.formula?.ooxml) {
    return element.formula.ooxml
  }
  if (element.formula?.ast) {
    const cacheKey = createOoxmlFormulaExportCacheKey(element)
    const cachedOoxml = cacheKey ? getCachedOoxmlFormula(cacheKey) : undefined
    if (cachedOoxml !== undefined) {
      return cachedOoxml
    }
    return setCachedOoxmlFormula(
      cacheKey,
      completeFormulaDerivedFormats(element.formula).ooxml || ''
    )
  }
  return createOoxmlTextRun(createOoxmlFormulaTextRunElement(element))
}
