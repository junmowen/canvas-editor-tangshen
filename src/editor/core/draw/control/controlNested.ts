import { CONTROL_STYLE_ATTR, EDITOR_ROW_ATTR } from '../../../dataset/constant/Element'
import { ControlComponent } from '../../../dataset/enum/Control'
import { DeepRequired } from '../../../interface/Common'
import { IControl } from '../../../interface/Control'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { pickObject } from '../../../utils'
import { formatElementList } from '../../../utils/element'

export function createNestedControlValueElementList(payload: {
  element: IElement
  startElement: IElement
  editorOptions: DeepRequired<IEditorOption>
}): IElement[] {
  const { element, startElement, editorOptions } = payload
  const nestedElementList: IElement[] = [
    {
      ...pickObject(element, EDITOR_ROW_ATTR),
      ...pickObject(element.control!, CONTROL_STYLE_ATTR),
      ...element,
      control: {
        ...element.control!,
        value: element.control!.value ? [...element.control!.value] : null
      }
    } as IElement
  ]
  formatElementList(nestedElementList, {
    isHandleFirstElement: false,
    isForceCompensation: false,
    isFromControlValue: true,
    parentControlId: startElement.controlId,
    editorOptions
  })
  return nestedElementList
}

export function createExpandedNestedControlValueElementList(payload: {
  prefixElement: IElement
  control: IControl
  valueElementList: IElement[]
}): IElement[] {
  const { prefixElement, control, valueElementList } = payload
  return valueElementList.map(item => ({
    ...pickObject(prefixElement, [
      'parentControlId',
      'controlId',
      ...CONTROL_STYLE_ATTR
    ]),
    ...item,
    control,
    controlComponent: ControlComponent.VALUE
  }))
}
