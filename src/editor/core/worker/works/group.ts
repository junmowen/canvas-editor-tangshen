import { IElement } from '../../../interface/Element'
import { walkElementTree } from '../../utils/ElementTreeTraversal'

function getGroupIds(elementList: IElement[]): string[] {
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
