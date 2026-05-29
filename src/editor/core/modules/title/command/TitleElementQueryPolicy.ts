import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

/** 判断按 ID 查询元素时是否保留标题上下文字段。 */
export function shouldKeepTitleContextForElement(element: IElement) {
  return element.type === ElementType.TITLE
}
