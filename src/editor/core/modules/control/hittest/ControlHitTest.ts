import { ElementType } from '../../../..'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'

/** 判断元素是否为控件或普通 checkbox 命中目标。 */
export function isCheckboxHitElement(element: IElement) {
  return (
    element.type === ElementType.CHECKBOX ||
    element.controlComponent === ControlComponent.CHECKBOX
  )
}

/** 判断元素是否为控件或普通 radio 命中目标。 */
export function isRadioHitElement(element: IElement) {
  return (
    element.type === ElementType.RADIO ||
    element.controlComponent === ControlComponent.RADIO
  )
}

/** 判断元素是否位于控件结构内。 */
export function isElementInControl(element?: IElement) {
  return !!element?.controlId
}
