import { CONTROL_STYLE_ATTR, EDITOR_ROW_ATTR } from '../../../../dataset/constant/Element'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { DeepRequired } from '../../../../interface/Common'
import { IControl } from '../../../../interface/Control'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement } from '../../../../interface/Element'
import { pickObject } from '../../../../utils'
import { formatElementList } from '../../../../utils/element'

export function createNestedControlValueElementList(payload: {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 起始元素，用于标记范围左边界对应的文档元素。 */
  startElement: IElement
  /** 编辑器配置项，用于读取全局排版和交互规则。 */
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
  /** 前缀元素，用于定位控件值前的边界元素。 */
  prefixElement: IElement
  /** 控件配置对象，描述当前控件的行为和取值规则。 */
  control: IControl
  /** 值元素列表，保存控件内部可编辑内容。 */
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
