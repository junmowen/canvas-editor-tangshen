import { ControlComponent, ControlType } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'
import { Control } from '../runtime/Control'

export function isAllowedControlDrag(
  cacheStartElement: IElement,
  cacheEndElement: IElement
) {
  return (
    ((!cacheStartElement.controlId ||
      cacheStartElement.controlComponent === ControlComponent.PREFIX) &&
      (!cacheEndElement.controlId ||
        cacheEndElement.controlComponent === ControlComponent.POSTFIX)) ||
    (cacheStartElement.controlId === cacheEndElement.controlId &&
      cacheStartElement.controlComponent === ControlComponent.PREFIX &&
      cacheEndElement.controlComponent === ControlComponent.POSTFIX) ||
    (cacheStartElement.control?.type === ControlType.TEXT &&
      cacheStartElement.controlComponent === ControlComponent.VALUE &&
      cacheEndElement.control?.type === ControlType.TEXT &&
      cacheEndElement.controlComponent === ControlComponent.VALUE)
  )
}

/** 判断拖拽提交时是否应移除控件上下文属性。 */
export function shouldOmitControlContextForDragDrop(payload: {
  /** 控件管理器，用于判断拖拽内容是否包含完整控件结构。 */
  control: Control
  /** 拖拽落点元素。 */
  targetElement: IElement
  /** 拖拽元素列表。 */
  dragElementList: IElement[]
  /** 拖拽内容是否包含控件元素。 */
  isContainControl: boolean
}) {
  const { control, targetElement, dragElementList, isContainControl } = payload
  return (
    !isContainControl ||
    !!targetElement.controlId ||
    !control.getIsElementListContainFullControl(dragElementList)
  )
}

/** 判断元素列表是否包含控件元素。 */
export function hasControlElement(elementList: IElement[]) {
  return elementList.some(element => !!element.controlId)
}
