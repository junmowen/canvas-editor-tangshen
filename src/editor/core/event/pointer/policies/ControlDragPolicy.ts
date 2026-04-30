import { ControlComponent, ControlType } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'

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
