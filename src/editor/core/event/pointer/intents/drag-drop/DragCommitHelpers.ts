import { IElement } from '../../../../../interface/Element'
import { getUUID } from '../../../../../utils'

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
