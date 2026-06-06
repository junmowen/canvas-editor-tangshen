import { ITd } from '../../../interface/table/Td'

/** 纵向合并导入状态，记录 restart 单元格供后续 continuation 累加 rowspan。 */
export interface IOoxmlVerticalMergeImportState {
  /** 纵向合并起点单元格。 */
  td: ITd
  /** 起点单元格横向跨列数量。 */
  colspan: number
}

export type TOoxmlVerticalMergeImportMap = Map<
  number,
  IOoxmlVerticalMergeImportState
>

/** continuation 单元格不生成新的内部 td，只递增起点 rowspan。 */
export function applyOoxmlVerticalMergeContinuation(
  verticalMergeMap: TOoxmlVerticalMergeImportMap,
  colIndex: number
) {
  const mergeState = verticalMergeMap.get(colIndex)
  if (!mergeState) return undefined
  mergeState.td.rowspan += 1
  return mergeState.colspan
}

/** restart 单元格在所有横跨列上登记起点，非合并单元格清理旧状态。 */
export function updateOoxmlVerticalMergeState(payload: {
  verticalMergeMap: TOoxmlVerticalMergeImportMap
  colIndex: number
  td: ITd
  isRestart: boolean
}) {
  const { verticalMergeMap, colIndex, td, isRestart } = payload
  for (let index = 0; index < td.colspan; index++) {
    if (isRestart) {
      verticalMergeMap.set(colIndex + index, {
        td,
        colspan: td.colspan
      })
    } else {
      verticalMergeMap.delete(colIndex + index)
    }
  }
}
