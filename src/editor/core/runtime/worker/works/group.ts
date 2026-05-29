import { IElement } from '../../../../interface/Element'
import { walkElementTree } from '../../../shared/traversal/ElementTreeTraversal'

function getGroupIds(elementList: IElement[]): string[] {
  // 初始化 group Ids 列表。
  const groupIds: string[] = []
  walkElementTree({
    elementList,
    visitor: ({ element }) => {
      if (!element.groupIds) return
      for (const groupId of element.groupIds) {
        if (!groupIds.includes(groupId)) {
          groupIds.push(groupId)
        }
      }
    }
  })
  return groupIds
}

onmessage = evt => {
  const elementList = <IElement[]>evt.data
  const groupIds = getGroupIds(elementList)
  postMessage(groupIds)
}
