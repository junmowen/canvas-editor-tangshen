import { ZERO } from '../../../dataset/constant/Common'
import { IElement } from '../../../interface/Element'

/** 更新行布局过程中列表编号状态。 */
export function updateRowLayoutListIndex(payload: {
  element: IElement
  currentListId?: string
  listIndex: number
  listIndexMap: Map<string, number>
}) {
  const {
    element,
    currentListId,
    listIndexMap
  } = payload
  let listIndex = payload.listIndex
  if (element.listId) {
    if (element.listId !== currentListId) {
      listIndexMap.clear()
    }
    if (element.value === ZERO && !element.listWrap) {
      const level = element.listLevel || 0
      const indexKey = `${element.listId}:${level}`
      listIndex = listIndexMap.get(indexKey) || 0
      listIndexMap.set(indexKey, listIndex + 1)
      for (const key of [...listIndexMap.keys()]) {
        const [, keyLevel] = key.split(':')
        if (Number(keyLevel) > level) {
          listIndexMap.delete(key)
        }
      }
    }
  }
  return {
    listId: element.listId,
    listIndex
  }
}
