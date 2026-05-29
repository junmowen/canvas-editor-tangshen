import { IElement } from '../../../../../interface/Element'
import { getUUID } from '../../../../../utils'

/** drag元素，描述文档元素在该场景下扩展的业务属性。 */
type IDragElement = IElement & { dragId: string }

export function createDragId(element: IElement): string {
  const dragId = getUUID()
  Reflect.set(element, 'dragId', dragId)
  return dragId
}

export function getElementIndexByDragId(
  dragId: string,
  elementList: IElement[]
) {
  return (<IDragElement[]>elementList).findIndex(el => el.dragId === dragId)
}
