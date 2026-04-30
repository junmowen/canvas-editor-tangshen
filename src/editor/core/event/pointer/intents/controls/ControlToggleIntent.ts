import { ControlComponent, ControlType } from '../../../../../dataset/enum/Control'
import { IElement } from '../../../../../interface/Element'
import { Draw } from '../../../../draw/Draw'
import { CheckboxControl } from '../../../../draw/control/checkbox/CheckboxControl'
import { RadioControl } from '../../../../draw/control/radio/RadioControl'

export function applyCheckboxToggle(payload: { draw: Draw; element: IElement }) {
  const { draw, element } = payload
  const { checkbox, control } = element
  if (!control) {
    draw.getCheckboxParticle().setSelect(element)
    return
  }
  const codes = control?.code ? control.code.split(',') : []
  if (checkbox?.value) {
    const codeIndex = codes.findIndex(c => c === checkbox.code)
    codes.splice(codeIndex, 1)
  } else if (checkbox?.code) {
    codes.push(checkbox.code)
  }
  const activeControl = draw.getControl().getActiveControl()
  if (activeControl instanceof CheckboxControl) {
    activeControl.setSelect(codes)
  }
}

export function applyRadioToggle(payload: { draw: Draw; element: IElement }) {
  const { draw, element } = payload
  const { radio, control } = element
  if (!control) {
    draw.getRadioParticle().setSelect(element)
    return
  }
  const codes = radio?.code ? [radio.code] : []
  const activeControl = draw.getControl().getActiveControl()
  if (activeControl instanceof RadioControl) {
    activeControl.setSelect(codes)
  }
}

export function applyValueLinkedControlToggle(payload: {
  draw: Draw
  elementList: IElement[]
  curIndex: number
}) {
  const { draw, elementList, curIndex } = payload
  const curElement = elementList[curIndex]
  if (!curElement) {
    return false
  }
  if (
    curElement.controlComponent !== ControlComponent.VALUE ||
    (curElement.control?.type !== ControlType.CHECKBOX &&
      curElement.control?.type !== ControlType.RADIO)
  ) {
    return false
  }
  let preIndex = curIndex
  while (preIndex > 0) {
    const preElement = elementList[preIndex]
    if (!preElement) {
      preIndex--
      continue
    }
    if (preElement.controlComponent === ControlComponent.CHECKBOX) {
      applyCheckboxToggle({ draw, element: preElement })
      return true
    }
    if (preElement.controlComponent === ControlComponent.RADIO) {
      applyRadioToggle({ draw, element: preElement })
      return true
    }
    preIndex--
  }
  return false
}
