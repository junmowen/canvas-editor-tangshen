import { ControlComponent, ControlType } from '../../../dataset/enum/Control'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'

/** 解析控件核心显示文本，不包含内部 preText/postText 和外层 prefix/postfix。 */
function getOoxmlControlRawDisplayText(element: IElement) {
  if (element.value) return element.value
  const controlValueText = (element.control?.value || [])
    .map(valueElement => valueElement.value || '')
    .join('')
  if (controlValueText) return controlValueText
  const matchedValueSet = element.control?.valueSets?.find(
    valueSet => String(valueSet.code) === String(element.control?.code)
  )
  return matchedValueSet?.value || element.control?.placeholder || ''
}

/** 拼接控件内部前后文本，导出时保留“其他：”“单位”等业务提示，外层大括号不参与。 */
function wrapOoxmlControlInnerText(
  control: IElement['control'],
  value: string
) {
  if (!value) return ''
  return `${control?.preText || ''}${value}${control?.postText || ''}`
}

/** 解析控件显示文本，导出为用户可读普通文本，并保留控件内部 preText/postText。 */
export function getOoxmlControlDisplayText(element: IElement) {
  return wrapOoxmlControlInnerText(
    element.control,
    getOoxmlControlRawDisplayText(element)
  )
}

/** 判断元素是否是业务控件展开后的结构片段。 */
function isOoxmlInlineBusinessControlFragment(element: IElement) {
  return Boolean(
    element.controlId &&
      element.controlComponent &&
      element.control
  )
}

/** 判断元素是否是控件前后缀边界，导出为普通文本时必须跳过。 */
export function isOoxmlControlAffixElement(element: IElement) {
  return (
    element.controlComponent === ControlComponent.PREFIX ||
    element.controlComponent === ControlComponent.POSTFIX
  )
}

/** 从选择类控件配置中解析已选中的展示文本。 */
function getOoxmlChoiceControlSelectedText(control: NonNullable<IElement['control']>) {
  if (
    control.code === undefined ||
    control.code === null ||
    !Array.isArray(control.valueSets) ||
    !control.valueSets.length
  ) {
    return ''
  }
  const codeList = String(control.code).split(',')
  const valueList = control.valueSets
    .filter(valueSet => codeList.includes(String(valueSet.code)))
    .map(valueSet => valueSet.value)
  return valueList.join(control.multiSelectDelimiter || '、')
}

/** 读取展开控件中的内部前文本或后文本，优先使用真实片段，缺失时使用控件配置默认值。 */
function getOoxmlInlineControlInnerAffixText(
  fragmentList: IElement[],
  component: ControlComponent.PRE_TEXT | ControlComponent.POST_TEXT,
  defaultText: string | undefined
) {
  const text = fragmentList
    .filter(element => element.controlComponent === component)
    .map(element => element.value || '')
    .join('')
  return text || defaultText || ''
}

/** 读取展开控件指定组件的样式来源，分段导出时避免占位颜色污染前后文本。 */
function getOoxmlInlineControlComponentStyleSource(
  fragmentList: IElement[],
  component: ControlComponent,
  defaultStyleSource: IElement
) {
  return (
    fragmentList.find(element => element.controlComponent === component) ||
    defaultStyleSource
  )
}

/** 创建展开控件的普通文本片段，控件结构字段仅作为导出前内部上下文，最终按 TEXT 输出。 */
function createOoxmlInlineControlTextElement(
  styleSource: IElement,
  value: string
) {
  return {
    ...styleSource,
    type: ElementType.TEXT,
    value
  }
}

/** 从展开后的控件片段中解析真实值片段：有值取值，无值取占位提示，跳过大括号前后缀。 */
function resolveOoxmlInlineControlValueSegment(fragmentList: IElement[]) {
  const control = fragmentList[0].control
  const defaultStyleSource =
    fragmentList.find(element => !isOoxmlControlAffixElement(element)) ||
    fragmentList[0]
  if (
    control &&
    (control.type === ControlType.SELECT ||
      control.type === ControlType.CHECKBOX ||
      control.type === ControlType.RADIO)
  ) {
    // 选择、复选和单选控件导出业务已选值，不把未选候选项全部写进 DOCX。
    const selectedText = getOoxmlChoiceControlSelectedText(control)
    if (selectedText) {
      return {
        text: selectedText,
        styleSource: getOoxmlInlineControlComponentStyleSource(
          fragmentList,
          ControlComponent.VALUE,
          defaultStyleSource
        )
      }
    }
  }
  const valueText = fragmentList
    .filter(element => element.controlComponent === ControlComponent.VALUE)
    .map(element => element.value || '')
    .join('')
  if (valueText) {
    return {
      text: valueText,
      styleSource: getOoxmlInlineControlComponentStyleSource(
        fragmentList,
        ControlComponent.VALUE,
        defaultStyleSource
      )
    }
  }
  const placeholderText = fragmentList
    .filter(element => element.controlComponent === ControlComponent.PLACEHOLDER)
    .map(element => element.value || '')
    .join('')
  if (placeholderText) {
    return {
      text: placeholderText,
      styleSource: getOoxmlInlineControlComponentStyleSource(
        fragmentList,
        ControlComponent.PLACEHOLDER,
        defaultStyleSource
      )
    }
  }
  return {
    text: getOoxmlControlRawDisplayText(fragmentList[0]),
    styleSource: defaultStyleSource
  }
}

/** 从展开后的控件片段中提取导出元素：pre/value/post 分开输出，避免整段继承占位灰色。 */
function getOoxmlInlineControlFragmentElementList(fragmentList: IElement[]) {
  const control = fragmentList[0].control
  const valueSegment = resolveOoxmlInlineControlValueSegment(fragmentList)
  if (!valueSegment.text) return []
  const defaultStyleSource = valueSegment.styleSource
  const preText = getOoxmlInlineControlInnerAffixText(
    fragmentList,
    ControlComponent.PRE_TEXT,
    control?.preText
  )
  const postText = getOoxmlInlineControlInnerAffixText(
    fragmentList,
    ControlComponent.POST_TEXT,
    control?.postText
  )
  const elementList: IElement[] = []
  if (preText) {
    elementList.push(
      createOoxmlInlineControlTextElement(
        getOoxmlInlineControlComponentStyleSource(
          fragmentList,
          ControlComponent.PRE_TEXT,
          defaultStyleSource
        ),
        preText
      )
    )
  }
  elementList.push(
    createOoxmlInlineControlTextElement(
      valueSegment.styleSource,
      valueSegment.text
    )
  )
  if (postText) {
    elementList.push(
      createOoxmlInlineControlTextElement(
        getOoxmlInlineControlComponentStyleSource(
          fragmentList,
          ControlComponent.POST_TEXT,
          defaultStyleSource
        ),
        postText
      )
    )
  }
  return elementList
}

/** 把编辑器展开后的控件边界片段归并为一个普通文本元素，避免导出 `{占位}` 或 `{值}`。 */
export function normalizeOoxmlInlineControlFragments(elementList: IElement[]) {
  const normalizedElementList: IElement[] = []
  let index = 0
  while (index < elementList.length) {
    const element = elementList[index]
    if (!isOoxmlInlineBusinessControlFragment(element)) {
      normalizedElementList.push(element)
      index++
      continue
    }

    const controlId = element.controlId
    const fragmentList: IElement[] = []
    while (
      index < elementList.length &&
      elementList[index].controlId === controlId &&
      isOoxmlInlineBusinessControlFragment(elementList[index])
    ) {
      fragmentList.push(elementList[index])
      index++
    }

    normalizedElementList.push(
      ...getOoxmlInlineControlFragmentElementList(fragmentList)
    )
  }
  return normalizedElementList
}
