import { IRow } from '../../../../interface/Row'

/** 单次 splice 展开参数上限，避免大粘贴窗口一次 spread 触发调用栈限制。 */
const PATCH_ARRAY_SEGMENT_CHUNK_SIZE = 8192

/** 替换数组局部片段；长度一致时直接覆盖，避免靠前位置 splice 搬移整篇尾部。 */
export function patchArraySegment<T>(payload: {
  /** 列表列表，保存同类数据的有序集合。 */
  list: T[]
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 删除数量，用于描述从起点移除的元素个数。 */
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
  /** 行列表，保存排版后的行结构。 */
  rowList: IRow[]
  /** 起始偏移量，用于在文本或表格片段内定位范围起点。 */
  startOffset: number
  /** 索引偏移量，用于把局部变更同步到后续元素。 */
  indexDelta: number
  /** 行偏移量，用于描述表格或布局变更后的行号变化。 */
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
