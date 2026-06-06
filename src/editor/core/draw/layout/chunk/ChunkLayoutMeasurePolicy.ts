import { IRow } from '../../../../interface/Row'
import {
  IChunkLayoutMeasureResult,
  IChunkLayoutPatchContext
} from './ChunkLayoutTypes'

/** 判断旧 chunk 行是否能作为局部测量的替换窗口。 */
export function canUseChunkMeasureOldRows(rowList: IRow[]) {
  return !rowList.some(row => row.isSurround)
}

/** 判断局部 chunk 是否落在分栏上下文中。 */
export function isChunkColumnLocalMeasureContext(rowList: IRow[]) {
  return rowList.some(row => row.columnIndex !== undefined || row.columns)
}

/** 分栏局部测量必须保持旧行数量，否则写回会跨栏错位。 */
export function isChunkColumnMeasureRowCountStable(payload: {
  oldRowList: IRow[]
  rowList: IRow[]
}) {
  return (
    !isChunkColumnLocalMeasureContext(payload.oldRowList) ||
    payload.rowList.length === payload.oldRowList.length
  )
}

/** 局部测量行继承旧行栏位，避免 position 阶段回退到第一栏。 */
export function applyChunkMeasureRowColumnContext(payload: {
  rowList: IChunkLayoutMeasureResult['rowList']
  context: IChunkLayoutPatchContext
}) {
  payload.rowList.forEach((row, index) => {
    const oldRow =
      payload.context.oldChunkRows[
        Math.min(index, payload.context.oldChunkRows.length - 1)
      ]
    row.columnIndex = oldRow?.columnIndex
    row.columns = oldRow?.columns
    if (index === 0) {
      row.columnStartY = payload.context.startY
    } else if (oldRow?.columnStartY !== undefined) {
      row.columnStartY = oldRow.columnStartY
    }
  })
}

/** 判断 chunk 测量结果是否仍可安全写回运行时。 */
export function getChunkMeasureRiskReason(payload: {
  rowList: IChunkLayoutMeasureResult['rowList']
  positionList: IChunkLayoutMeasureResult['positionList']
  expectedElementCount: number
}) {
  if (!payload.rowList.length) {
    return 'empty-row'
  }
  const measuredElementCount = payload.rowList.reduce(
    (count, row) => count + row.elementList.length,
    0
  )
  if (
    measuredElementCount !== payload.expectedElementCount ||
    payload.positionList.length !== payload.expectedElementCount
  ) {
    return 'chunk-measure-count-mismatch'
  }
  return null
}
