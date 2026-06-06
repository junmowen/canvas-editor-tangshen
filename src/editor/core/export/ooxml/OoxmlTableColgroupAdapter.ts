import { IColgroup } from '../../../interface/table/Colgroup'
import { ITr } from '../../../interface/table/Tr'

/** 从无 tblGrid 的外部表格首个完整非合并宽度行推导 colgroup。 */
function inferOoxmlTableColgroupFromRows(trList: ITr[]): IColgroup[] {
  for (const row of trList) {
    const tdList = row.tdList || []
    if (!tdList.length) continue
    const hasOnlySingleSpanWidthCells = tdList.every(
      td => (td.colspan || 1) === 1 && (td.width || 0) > 0
    )
    if (!hasOnlySingleSpanWidthCells) continue

    const widthMap = new Map<number, number>()
    tdList.forEach(td => {
      widthMap.set(td.colIndex || 0, td.width || 0)
    })
    const maxIndex = Math.max(...Array.from(widthMap.keys()))
    const colgroup = Array.from({ length: maxIndex + 1 }, (_, index) => ({
      width: widthMap.get(index) || 0
    }))
    if (colgroup.every(col => col.width > 0)) {
      return colgroup
    }
  }
  return []
}

/** 从已解析单元格覆盖范围推导最大逻辑列数，支持 gridSpan/colspan。 */
function getOoxmlTableMaxColumnCount(trList: ITr[]) {
  return trList.reduce((maxColumnCount, row) => {
    const rowColumnCount = (row.tdList || []).reduce((max, td) => {
      const start = td.colIndex || 0
      const span = Math.max(1, td.colspan || 1)
      return Math.max(max, start + span)
    }, 0)
    return Math.max(maxColumnCount, rowColumnCount)
  }, 0)
}

/** 无 tblGrid 且无法从 tcW 推导时，按 tblW 和最大列数等分列宽。 */
function inferOoxmlTableColgroupFromTableWidth(
  trList: ITr[],
  tableWidth: number
): IColgroup[] {
  const columnCount = getOoxmlTableMaxColumnCount(trList)
  if (tableWidth <= 0 || columnCount <= 0) return []
  const columnWidth = tableWidth / columnCount
  return Array.from({ length: columnCount }, () => ({
    width: columnWidth
  }))
}

/** 解析导入表格的最终列宽来源：tblGrid > 完整单元格宽度行 > tblW 等分。 */
export function resolveImportedOoxmlTableColgroup(payload: {
  parsedColgroup: IColgroup[]
  trList: ITr[]
  tableWidth: number
}) {
  const rowColgroup = payload.parsedColgroup.length
    ? payload.parsedColgroup
    : inferOoxmlTableColgroupFromRows(payload.trList)
  return rowColgroup.length
    ? rowColgroup
    : inferOoxmlTableColgroupFromTableWidth(payload.trList, payload.tableWidth)
}
