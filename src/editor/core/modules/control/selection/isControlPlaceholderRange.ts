import { ControlComponent } from '../../../../dataset/enum/Control'
import { IRange } from '../../../../interface/Range'
import { Draw } from '../../../draw/Draw'

/** 判断拖选范围是否只覆盖同一控件的 placeholder。 */
export function isControlPlaceholderRange(draw: Draw, range: IRange) {
  const elementList = draw.getObjectResolver().getElementList()
  const startElement = elementList[range.startIndex + 1]
  const endElement = elementList[range.endIndex]
  return !!(
    startElement?.controlComponent === ControlComponent.PLACEHOLDER &&
    endElement?.controlComponent === ControlComponent.PLACEHOLDER &&
    startElement.controlId === endElement.controlId
  )
}
