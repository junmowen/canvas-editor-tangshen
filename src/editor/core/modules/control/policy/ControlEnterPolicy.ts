import { ControlComponent, ControlType } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'
import { Control } from '../runtime/Control'

/** 回车继承样式时，控件后缀不应把控件内联样式继续带到新元素。 */
export function shouldCopyStyleForEnterAnchor(element: IElement) {
  return element.controlComponent !== ControlComponent.POSTFIX
}

/** 数字控件内禁用回车输入，避免破坏单值控件结构。 */
export function shouldPreventEnterInActiveControl(control: Control) {
  const activeControlElement = control.getActiveControl()?.getElement()
  return activeControlElement?.control?.type === ControlType.NUMBER
}
