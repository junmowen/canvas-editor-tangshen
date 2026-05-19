import { IRow } from '../../../../interface/Row'

/** 单次 splice 展开参数上限，避免大粘贴窗口一次 spread 触发调用栈限制。 */
const PATCH_ARRAY_SEGMENT_CHUNK_SIZE = 8192

/** 替换数组局部片段；长度一致时直接覆盖，避免靠前位置 splice 搬移整篇尾部。 */
export function patchArraySegment<T>(payload: {
  list: T[]
  startIndex: number
  deleteCount: number
  itemList: T[]
}) {
  if (payload.deleteCount === payload.itemList.length) {
    for (let i = 0; i < payload.itemList.length; i++) {
      payload.list[payload.startIndex + i] = payload.itemList[i]
    }
    return
  }
  payload.list.splice(payload.startIndex, payload.deleteCount)
  for (
    let offset = 0;
    offset < payload.itemList.length;
    offset += PATCH_ARRAY_SEGMENT_CHUNK_SIZE
  ) {
    payload.list.splice(
      payload.startIndex + offset,
      0,
      ...payload.itemList.slice(offset, offset + PATCH_ARRAY_SEGMENT_CHUNK_SIZE)
    )
  }
}

/** 计算行组高度，包含 offsetY。 */
export function getRowsHeight(rowList: Array<{ height: number; offsetY?: number }>) {
  return rowList.reduce((sum, row) => sum + row.height + (row.offsetY || 0), 0)
}

/** 平移窗口之后的行起始索引和全局行号。 */
export function shiftRowsAfterPatch(payload: {
  rowList: IRow[]
  startOffset: number
  indexDelta: number
  rowDelta: number
}) {
  if (!payload.indexDelta && !payload.rowDelta) {
    return
  }
  for (let i = payload.startOffset; i < payload.rowList.length; i++) {
    const row = payload.rowList[i]
    if (payload.indexDelta) {
      row.startIndex += payload.indexDelta
    }
    if (payload.rowDelta) {
      row.rowIndex += payload.rowDelta
    }
  }
}
