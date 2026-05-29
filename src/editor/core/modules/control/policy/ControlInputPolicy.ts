import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'
import { Control } from '../runtime/Control'

/** 判断当前 range 边界是否允许输入，包含控件组件边界约束。 */
export function isControlRangeInputAllowed(payload: {
  /** range 起始索引。 */
  startIndex: number
  /** range 结束索引。 */
  endIndex: number
  /** range 起点元素。 */
  startElement: IElement
  /** range 终点元素。 */
  endElement?: IElement | null
  /** 闭合 range 后继元素，用于判断前置文本边界。 */
  nextElement?: IElement | null
}) {
  const { startIndex, endIndex, startElement, endElement, nextElement } = payload
  if (startIndex === endIndex) {
    return (
      (startElement.controlComponent !== ControlComponent.PRE_TEXT ||
        nextElement?.controlComponent !== ControlComponent.PRE_TEXT) &&
      startElement.controlComponent !== ControlComponent.POST_TEXT
    )
  }
  if (!endElement) return false
  return (
    (!startElement.controlId && !endElement.controlId) ||
    ((!startElement.controlId ||
      startElement.controlComponent === ControlComponent.POSTFIX) &&
      (!endElement.controlId ||
        endElement.controlComponent === ControlComponent.POSTFIX)) ||
    (!!startElement.controlId &&
      endElement.controlId === startElement.controlId &&
      endElement.controlComponent !== ControlComponent.PRE_TEXT &&
      endElement.controlComponent !== ControlComponent.POST_TEXT &&
      endElement.controlComponent !== ControlComponent.POSTFIX)
  )
}

/** 判断当前是否存在正在编辑的 active control。 */
export function hasActiveControlEditing(control: Control) {
  return !!control.getActiveControl()
}
