import { CONTROL_CONTEXT_ATTR } from '../../../dataset/constant/Element'
import { ZERO } from '../../../dataset/constant/Common'
import { ControlComponent, ControlType } from '../../../dataset/enum/Control'
import { IControl } from '../../../interface/Control'
import { IElement } from '../../../interface/Element'
import { omitObject } from '../../../utils'
import { isTextLikeControlType } from './controlType'

export function collectTextControlValueBlock(payload: {
  elementList: IElement[]
  startIndex: number
  controlId: string
  controlType: ControlType
}): {
  textControlValue: string
  textControlElementList: IElement[]
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
  code: IControl['code']
  valueSets: IControl['valueSets']
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
