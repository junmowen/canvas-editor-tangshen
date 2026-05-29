import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'
import { IControlContext } from '../../../../interface/Control'
import { Control } from '../runtime/Control'

/** 判断当前删除范围是否命中表单模式下不可直接删除的控件结构。 */
export function isRangeControlDeletionDisabled(
  control: Control,
  context: IControlContext = {}
) {
  return control.getIsRangeControlDeletionDisabled(context)
}

/** 判断表单模式控件禁删开启时，当前元素是否仍允许作为控件值删除。 */
export function canDeleteControlValueInFormMode(
  element: IElement | undefined,
  isDisableControlDeleteInFormMode: boolean
) {
  return (
    !isDisableControlDeleteInFormMode ||
    !element?.controlId ||
    element.controlComponent === ControlComponent.VALUE
  )
}
