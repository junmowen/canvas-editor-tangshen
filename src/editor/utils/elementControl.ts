import { ZERO } from '../dataset/constant/Common'
import { ControlComponent, ControlType } from '../dataset/enum/Control'
import { ElementType } from '../dataset/enum/Element'
import { DeepRequired } from '../interface/Common'
import { IEditorOption } from '../interface/Editor'
import { IElement } from '../interface/Element'
import { splitText } from '.'

interface IAppendControlValueSetTextPayload {
  elementList: IElement[]
  insertIndex: number
  valueStyleIndex: number
  valueStyleList: IElement[]
  value: string
  gap?: number
  controlId: string
  control?: IElement['control']
  controlContext: Partial<IElement>
  controlExplicitStyle: Partial<IElement>
}

/**
 * 将控件 valueList 按字符拆成样式模板。
 *
 * checkbox/radio 的每个 valueSet 文案需要逐字复用外部 valueList
 * 的显式样式；集中在这里维护，避免两个控件各自实现一套拆分逻辑。
 */
export function createControlValueStyleList(valueList: IElement[]) {
  return valueList.reduce(
    (pre, cur) =>
      pre.concat(cur.value.split('').map(v => ({ ...cur, value: v }))),
    [] as IElement[]
  )
}

/**
 * 追加 checkbox/radio 选项后面的文本元素。
 *
 * 返回新的插入下标和样式模板下标，调用方可以继续插入下一个选项。
 */
export function appendControlValueSetText(
  payload: IAppendControlValueSetTextPayload
) {
  const {
    elementList,
    valueStyleList,
    controlContext,
    controlExplicitStyle,
    controlId,
    control,
    gap
  } = payload
  let insertIndex = payload.insertIndex
  let valueStyleIndex = payload.valueStyleIndex
  const valueStrList = splitText(payload.value)
  for (let e = 0; e < valueStrList.length; e++) {
    const value = valueStrList[e]
    const isLastLetter = e === valueStrList.length - 1
    elementList.splice(insertIndex, 0, {
      ...controlContext,
      ...controlExplicitStyle,
      ...valueStyleList[valueStyleIndex],
      controlId,
      value: value === '\n' ? ZERO : value,
      letterSpacing: isLastLetter ? gap : 0,
      control,
      controlComponent: ControlComponent.VALUE
    })
    valueStyleIndex++
    insertIndex++
  }
  return { insertIndex, valueStyleIndex }
}

/**
 * 获取控件对外展示文本，包含前后缀。
 */
export function getControlInlineText(
  element: IElement,
  editorOptions: DeepRequired<IEditorOption>
): string {
  const control = element.control
  if (!control) return element.value
  const prefix = control.prefix ?? editorOptions.control.prefix
  const postfix = control.postfix ?? editorOptions.control.postfix
  return `${prefix}${getControlInlineContentText(element, editorOptions)}${postfix}`
}

/**
 * 获取控件正文文本，包含控件内部 preText/postText，不包含外层 prefix/postfix。
 */
export function getControlInlineContentText(
  element: IElement,
  editorOptions: DeepRequired<IEditorOption>
): string {
  const control = element.control
  if (!control) return element.value
  const value = getControlInlineValueText(element, editorOptions)
  return `${control.preText || ''}${value}${control.postText || ''}`
}

function getControlInlineValueText(
  element: IElement,
  editorOptions: DeepRequired<IEditorOption>
): string {
  const control = element.control!
  if (
    (control.type === ControlType.SELECT ||
      control.type === ControlType.CHECKBOX ||
      control.type === ControlType.RADIO) &&
    Array.isArray(control.valueSets)
  ) {
    if (control.code !== undefined && control.code !== null) {
      const codeList = String(control.code).split(',')
      const valueList = control.valueSets
        .filter(valueSet => codeList.includes(String(valueSet.code)))
        .map(valueSet => valueSet.value)
      if (valueList.length) {
        return valueList.join(control.multiSelectDelimiter || '、')
      }
    }
    return control.placeholder || ''
  }
  if (Array.isArray(control.value) && control.value.length) {
    return control.value
      .map(valueElement =>
        valueElement.type === ElementType.CONTROL && valueElement.control
          ? getControlInlineText(valueElement, editorOptions)
          : valueElement.value
      )
      .join('')
  }
  return control.placeholder || ''
}
