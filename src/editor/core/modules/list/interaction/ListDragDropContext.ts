import { LIST_CONTEXT_ATTR } from '../../../../dataset/constant/Element'
import { IElement } from '../../../../interface/Element'

/** 根据拖拽策略为文本元素补充列表上下文字段。 */
export function appendListDragDropCopyAttrs(payload: {
  /** 待追加的复制属性集合。 */
  copyAttr: Array<keyof IElement>
  /** 拖拽源元素。 */
  element: IElement
  /** 是否保留源上下文。 */
  isPreserveSourceContext: boolean
}) {
  const { copyAttr, element, isPreserveSourceContext } = payload
  if (isPreserveSourceContext || element.listId) {
    copyAttr.push(...LIST_CONTEXT_ATTR)
  }
}
