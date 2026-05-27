import { CONTROL_STYLE_ATTR, TEXTLIKE_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { IElement } from '../../../interface/Element'
import { omitObject, pickObject } from '../../../utils'
import { isControlPrefixComponent } from './controlValue'

export function resolveControlAnchorElement(startElement: IElement): Partial<IElement> {
  return (startElement.type &&
    !TEXTLIKE_ELEMENT_TYPE.includes(startElement.type)) ||
    isControlPrefixComponent(startElement.controlComponent)
    ? pickObject(startElement, ['control', 'controlId', ...CONTROL_STYLE_ATTR])
    : omitObject(startElement, ['type'])
}
