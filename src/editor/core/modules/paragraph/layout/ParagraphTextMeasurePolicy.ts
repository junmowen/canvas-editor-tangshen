import { PUNCTUATION_LIST } from '../../../../dataset/constant/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

/** 判断元素是否可参与连续单词测量。 */
export function isParagraphWordMeasureElement(payload: {
  element: IElement
  letterReg: RegExp
}) {
  const { element, letterReg } = payload
  if (element.type && element.type !== ElementType.TEXT) {
    return false
  }
  return letterReg.test(element.value)
}

/** 判断元素是否是需要单独测量的段落标点。 */
export function isParagraphPunctuationElement(element: IElement) {
  return !!element && PUNCTUATION_LIST.includes(element.value)
}
