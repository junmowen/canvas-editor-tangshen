import { CONTROL_CONTEXT_ATTR } from '../../../../dataset/constant/Element'
import { ZERO } from '../../../../dataset/constant/Common'
import { ControlComponent, ControlType } from '../../../../dataset/enum/Control'
import { IControl } from '../../../../interface/Control'
import { IElement } from '../../../../interface/Element'
import { omitObject } from '../../../../utils'
import { isTextLikeControlType } from './controlType'

/** 收集 Text Control Value Block 对应的候选数据。 */
export function collectTextControlValueBlock(payload: {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 控件标识，用于关联同一控件的开始、值和结束元素。 */
  controlId: string
  controlType: ControlType
}): {
  /** 文本控件值，用于返回控件内部的纯文本内容。 */
  textControlValue: string
  /** 文本控件元素列表，保存控件值对应的文档元素。 */
  textControlElementList: IElement[]
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
} {
  const { elementList, startIndex, controlId, controlType } = payload
  let endIndex = startIndex
  let textControlValue = ''
  const textControlElementList: IElement[] = []
  while (endIndex < elementList.length) {
    const nextElement = elementList[endIndex]
    if (nextElement.controlId !== controlId) break
    if (
      isTextLikeControlType(controlType) &&
      nextElement.controlComponent === ControlComponent.VALUE
    ) {
      textControlValue += nextElement.value
      textControlElementList.push(omitObject(nextElement, CONTROL_CONTEXT_ATTR))
    }
    endIndex++
  }
  return {
    textControlValue: textControlValue
      .replace(new RegExp(`${ZERO}`, 'g'), '')
      .trim(),
    textControlElementList,
    endIndex
  }
}

export function resolveControlCodeDisplayText(payload: {
  /** 业务编码，用于识别控件、命令或错误类型。 */
  code: IControl['code']
  /** 值集合，用于保存可选值分组或枚举范围。 */
  valueSets: IControl['valueSets']
  /** 分隔符，用于拆分或拼接控件值。 */
  delimiter?: string
}): string {
  const { code, valueSets, delimiter = '' } = payload
  if (code === undefined || code === null || !Array.isArray(valueSets)) {
    return ''
  }
  return String(code)
    .split(',')
    .map(
      selectCode =>
        valueSets.find(valueSet => String(valueSet.code) === selectCode)?.value
    )
    .filter(Boolean)
    .join(delimiter)
}
