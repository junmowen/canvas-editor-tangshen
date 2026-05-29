import { IElement } from '../../../../interface/Element'

/** 判断当前选区是否包含列表上下文。 */
export function hasListSelectionContext(elementList: IElement[]) {
  return elementList.some(element => element.listId)
}
