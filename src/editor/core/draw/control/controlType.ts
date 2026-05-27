import { ControlType } from '../../../dataset/enum/Control'

export function isTextLikeControlType(type?: ControlType): boolean {
  return (
    type === ControlType.TEXT ||
    type === ControlType.DATE ||
    type === ControlType.NUMBER
  )
}

export function isChoiceControlType(type?: ControlType): boolean {
  return (
    type === ControlType.SELECT ||
    type === ControlType.CHECKBOX ||
    type === ControlType.RADIO
  )
}
