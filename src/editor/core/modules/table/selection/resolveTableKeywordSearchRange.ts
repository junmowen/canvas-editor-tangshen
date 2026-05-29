import { EditorContext } from '../../../../dataset/enum/Editor'
import { IRange } from '../../../../interface/Range'

/** 搜索命中来自表格时，补齐 range 的表格上下文。 */
export function resolveTableKeywordSearchRange(payload: {
  /** 搜索命中结果。 */
  searchMatch: {
    /** 命中类型。 */
    type?: EditorContext
    /** 表格标识。 */
    tableId?: string
    /** 单元格索引。 */
    tdIndex?: number
    /** 行索引。 */
    trIndex?: number
  }
  /** 基础 range。 */
  range: IRange
}) {
  const { searchMatch, range } = payload
  if (searchMatch.type !== EditorContext.TABLE) return range
  return {
    ...range,
    tableId: searchMatch.tableId,
    startTdIndex: searchMatch.tdIndex,
    endTdIndex: searchMatch.tdIndex,
    startTrIndex: searchMatch.trIndex,
    endTrIndex: searchMatch.trIndex
  }
}
