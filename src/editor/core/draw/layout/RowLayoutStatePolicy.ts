import { ZERO } from '../../../dataset/constant/Common'
import { IElement } from '../../../interface/Element'
import type { Draw } from '../Draw'

/** 判断相邻元素是否切换了段落级分栏配置，用于在行测量阶段断开分栏小节。 */
export function isColumnsChanged(
  preElement: IElement | undefined,
  element: IElement
) {
  if (!preElement) return false
  return getColumnsKey(preElement) !== getColumnsKey(element)
}

/** 生成元素分栏配置比较键，避免按对象引用误判。 */
function getColumnsKey(element?: IElement) {
  const columns = element?.columns
  if (!columns) return 'global'
  return JSON.stringify({
    count: columns.count,
    gap: columns.gap,
    widths: columns.widths || []
  })
}

/**
 * 局部排版主文档切片时，恢复切片前的有序列表计数。
 *
 * 完整排版会从 0 开始扫描整篇正文；chunk / 单行 patch 只传入当前片段，
 * 如果不预置前序计数，跨页列表在输入后会从 1 重新编号。
 */
export function createInitialListIndexState(payload: {
  /** Draw 门面，用于读取原始正文。 */
  draw: Draw
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 来源起始索引，用于定位对应元素、行或片段。 */
  sourceStartIndex: number
  /** 是否来源于表格，用于选择表格内专用排版路径。 */
  isFromTable: boolean
}): {
  /** 列表id，用于关联对应业务对象。 */
  listId?: string
  /** 列表索引map，用于按键快速查找对应数据。 */
  listIndexMap: Map<string, number>
} {
  const listIndexMap = new Map<string, number>()
  if (payload.isFromTable || payload.sourceStartIndex <= 0) {
    return { listIndexMap }
  }
  const firstElement = payload.elementList[0]
  if (!firstElement?.listId) {
    return { listIndexMap }
  }
  const sourceElementList = payload.draw
    .getObjectResolver()
    .getOriginalMainElementList()
  const listId = firstElement.listId
  let listStartIndex = payload.sourceStartIndex
  while (listStartIndex > 0) {
    const prevElement = sourceElementList[listStartIndex - 1]
    if (!prevElement || prevElement.listId !== listId) {
      break
    }
    listStartIndex--
  }
  for (let index = listStartIndex; index < payload.sourceStartIndex; index++) {
    const element = sourceElementList[index]
    if (element.value === ZERO && !element.listWrap) {
      const level = element.listLevel || 0
      const indexKey = `${element.listId}:${level}`
      listIndexMap.set(indexKey, (listIndexMap.get(indexKey) || 0) + 1)
      for (const key of [...listIndexMap.keys()]) {
        const [, keyLevel] = key.split(':')
        if (Number(keyLevel) > level) {
          listIndexMap.delete(key)
        }
      }
    }
  }
  return {
    listId,
    listIndexMap
  }
}
