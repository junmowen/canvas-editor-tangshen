import type {
  HeaderFooterPageScope,
  IHeaderFooterPageScopeData
} from '../../../../interface/Editor'
import type { IElement } from '../../../../interface/Element'

/**
 * 将零基 pageNo 解析为页眉页脚内容作用域。
 *
 * pageNo=0 对应首页；后续奇偶判断按 Word/OOXML 的一基页码语义计算。
 */
export function resolveHeaderFooterPageScope(
  pageNo: number
): HeaderFooterPageScope {
  const normalizedPageNo = Math.max(0, Math.floor(pageNo))
  if (normalizedPageNo === 0) return 'first'
  return (normalizedPageNo + 1) % 2 === 0 ? 'even' : 'odd'
}

/**
 * 按 pageNo 从作用域模型中选出页眉或页脚元素列表。
 *
 * 解析顺序：
 * - 首页：first -> odd -> all
 * - 偶数页：even -> all
 * - 奇数页：odd -> all
 */
export function resolveHeaderFooterScopedElementList(
  scopedData: IHeaderFooterPageScopeData[] | undefined,
  pageNo: number
): IElement[] {
  if (!scopedData?.length) return []

  const pageScope = resolveHeaderFooterPageScope(pageNo)
  const resolveOrder: HeaderFooterPageScope[] =
    pageScope === 'first' ? ['first', 'odd', 'all'] : [pageScope, 'all']
  for (const scope of resolveOrder) {
    const matchedData = scopedData.find(item => item.pageScope === scope)
    if (matchedData) return matchedData.elementList
  }
  return []
}

/** 获取当前页对应的页眉页脚元素列表；没有任何作用域时创建全页默认作用域。 */
export function ensureHeaderFooterScopedElementList(
  scopedData: IHeaderFooterPageScopeData[],
  pageNo: number
): IElement[] {
  const pageScope = resolveHeaderFooterPageScope(pageNo)
  const resolveOrder: HeaderFooterPageScope[] =
    pageScope === 'first' ? ['first', 'odd', 'all'] : [pageScope, 'all']
  for (const scope of resolveOrder) {
    const matchedData = scopedData.find(item => item.pageScope === scope)
    if (matchedData) return matchedData.elementList
  }
  const elementList: IElement[] = []
  scopedData.push({
    pageScope: scopedData.length ? pageScope : 'all',
    elementList
  })
  return elementList
}
