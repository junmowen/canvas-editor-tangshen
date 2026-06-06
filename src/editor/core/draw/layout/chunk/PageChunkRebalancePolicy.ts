import { IRow } from '../../../../interface/Row'
import { IChunkLayoutPatchContext } from './ChunkLayoutTypes'

/** 判断窗口尾页边界是否变化，变化时需要继续同步下一页。 */
export function shouldPropagatePageChunkRebalanceNext(payload: {
  /** 窗口内分页块列表，保存当前可见范围的布局块。 */
  windowChunkList: IChunkLayoutPatchContext['chunk'][]
  /** 页面行列表，保存当前页排版后的行信息。 */
  pageRowList: IRow[][]
  /** 已插入数量，用于累加本次写入的元素个数。 */
  insertedCount: number
}) {
  if (payload.pageRowList.length !== payload.windowChunkList.length) {
    return true
  }
  if (payload.insertedCount < 0) {
    return true
  }
  const lastChunk = payload.windowChunkList[payload.windowChunkList.length - 1]
  const lastPageRows = payload.pageRowList[payload.pageRowList.length - 1]
  const lastRow = lastPageRows?.[lastPageRows.length - 1]
  if (!lastChunk || !lastRow) {
    return false
  }
  const nextEndIndex =
    lastRow.startIndex + Math.max(0, lastRow.elementList.length - 1)
  return nextEndIndex !== lastChunk.endIndex + payload.insertedCount
}

/** 生成旧页窗口和新页窗口的并集，确保父 chunk 移动后旧表格页也被重绘清空。 */
export function createPageChunkRebalanceAffectedPageNoList(payload: {
  /** 起始页码，用于限定跨页范围的左边界。 */
  startPageNo: number
  /** 旧页面数量，用于判断局部重排后的分页变化。 */
  oldPageCount: number
  /** 重排后的页面数量，用于比较分页变化。 */
  nextPageCount: number
  /** 是否包含窗口，用于控制当前流程的判断分支。 */
  shouldIncludeWindow: boolean
  tableAffectedPageNoList: number[]
}) {
  if (!payload.shouldIncludeWindow) {
    return [payload.startPageNo]
  }
  const pageNoSet = new Set<number>()
  const pageCount = Math.max(payload.oldPageCount, payload.nextPageCount)
  for (let offset = 0; offset < pageCount; offset++) {
    pageNoSet.add(payload.startPageNo + offset)
  }
  payload.tableAffectedPageNoList.forEach(pageNo => pageNoSet.add(pageNo))
  return Array.from(pageNoSet)
}

/** 判断 dirty range planner 是否已经覆盖本次实际受影响页。 */
export function isPageChunkDirtyRangeScheduleSafe(payload: {
  affectedPageNoList: number[]
  dirtyRange: {
    startPageNo: number
    endPageNo: number
  }
}) {
  return payload.affectedPageNoList.every(pageNo => {
    return (
      pageNo >= payload.dirtyRange.startPageNo &&
      pageNo <= payload.dirtyRange.endPageNo
    )
  })
}

/** 解析表格尾页场景下下一轮异步传播页码。 */
export function resolvePageChunkTableTailAsyncPageNo(payload: {
  nextPageNo: number
  pageCount: number
  tableRange: {
    endPageNo: number
  } | null
}) {
  if (!payload.tableRange || payload.nextPageNo > payload.tableRange.endPageNo) {
    return {
      pageNo: payload.nextPageNo,
      skippedTableTail: false,
      afterTablePageNo: null
    }
  }
  const afterTablePageNo = payload.tableRange.endPageNo + 1
  if (afterTablePageNo >= payload.pageCount) {
    return {
      pageNo: null,
      skippedTableTail: true,
      afterTablePageNo
    }
  }
  return {
    pageNo: afterTablePageNo,
    skippedTableTail: true,
    afterTablePageNo
  }
}

/** 判断页级 rebalance 是否需要同步表格子 chunk 和表格范围索引。 */
export function shouldSyncPageChunkTableDescendants(payload: {
  oldTableAffectedPageNoList: number[]
  hasOldTableRows: boolean
  hasNextTableRows: boolean
}) {
  return (
    payload.oldTableAffectedPageNoList.length > 0 ||
    payload.hasOldTableRows ||
    payload.hasNextTableRows
  )
}
