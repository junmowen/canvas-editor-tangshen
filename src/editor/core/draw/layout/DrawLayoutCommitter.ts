import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'
import type { IPagePartitionResult } from './PagePartitioner'

export interface IDrawLayoutCommitPayload {
  /** 行布局结果。 */
  rowList: IRow[]
  /** 分页拆分结果。 */
  partitionResult: IPagePartitionResult
  /** 本次表格快照版本。 */
  tableLayoutSnapshotVersion: number
}

/** 提交完整布局状态，并重新计算坐标位置列表。 */
export function commitFullDrawLayoutState(
  draw: Draw,
  payload: IDrawLayoutCommitPayload
) {
  const {
    rowList,
    partitionResult,
    tableLayoutSnapshotVersion
  } = payload
  const typesettingLayoutSnapshot =
    draw.getServices().typesettingLayoutStructureBuilder.build({
      version: tableLayoutSnapshotVersion,
      pageRowList: partitionResult.pageRowList
    })
  draw.replaceMainElementList(partitionResult.mainElementList)
  draw.replaceLayoutState({
    rowList,
    pageRowList: partitionResult.pageRowList,
    layoutElementList: partitionResult.layoutElementList,
    typesettingLayoutSnapshot,
    tableLayoutSnapshotVersion,
    tableLayoutSnapshot: null
  })
  draw.getCoordinate().computePositionList()
}
