import {
  CHINESE_REG,
  NUMBER_LIKE_REG
} from '../../../../dataset/constant/Regular'
import { PUNCTUATION_LIST } from '../../../../dataset/constant/Common'
import { IElement } from '../../../../interface/Element'
import { isPlainTextElement } from './ParagraphRowLayoutPolicy'

/** 中文专业排版中可与数字组成不可拆分单位的后缀字符。 */
const NUMBER_UNIT_SUFFIX_SET = new Set([
  '%',
  '‰',
  '℃',
  '℉',
  '°',
  'm',
  'g',
  'l',
  'L',
  's',
  'h',
  'A',
  'V',
  'W',
  'J',
  'N',
  'P',
  'a',
  'K',
  'M',
  'G',
  'T',
  'k',
  'c',
  'd',
  'u',
  'μ',
  'n',
  'p',
  'b',
  'B',
  'z',
  'Z',
  'H',
  'Ω'
])

/** 单位组合内部允许出现的连接符，例如 mg/L、m/s、10^-3。 */
const NUMBER_UNIT_CONNECTOR_SET = new Set(['/', '·', '-', '^'])

/** 中文禁则中不应停留在行尾的开口标点。 */
const LINE_END_FORBIDDEN_OPEN_PUNCTUATION_SET = new Set([
  '(',
  '（',
  '[',
  '【',
  '〔',
  '「',
  '『',
  '《',
  '“',
  '‘'
])

/** 中文禁则中不应独立出现在行首的闭口标点。 */
const LINE_START_FORBIDDEN_CLOSING_PUNCTUATION_SET = new Set([
  ')',
  '）',
  ']',
  '】',
  '〕',
  '」',
  '』',
  '》',
  '”',
  '’'
])

/** 中文禁则中不应独立出现在行首的句读标点。 */
const LINE_START_FORBIDDEN_PUNCTUATION_SET = new Set([
  ...LINE_START_FORBIDDEN_CLOSING_PUNCTUATION_SET,
  ...PUNCTUATION_LIST
])

/** 英文和数字判定，用于中西文间距的边界识别。 */
const LATIN_OR_NUMBER_REG = /[A-Za-z0-9]/

/** 判断文本值是否是数字或小数点，作为单位组合的数字主体。 */
function isNumberBodyValue(value: string | undefined) {
  return !!value && NUMBER_LIKE_REG.test(value)
}

/** 判断文本值是否是单位后缀或单位内部连接符。 */
function isNumberUnitValue(value: string | undefined, customSuffixList: string[]) {
  return (
    !!value &&
    (NUMBER_UNIT_SUFFIX_SET.has(value) ||
      customSuffixList.includes(value) ||
      NUMBER_UNIT_CONNECTOR_SET.has(value))
  )
}

/** 判断当前位置前方是否存在同一个数字单位组合的数字主体。 */
function hasNumberBodyBeforeUnitSuffix(
  elementList: IElement[],
  index: number,
  customSuffixList: string[]
) {
  for (let cursor = index - 1; cursor >= 0; cursor--) {
    const element = elementList[cursor]
    if (!element || !isPlainTextElement(element)) return false
    if (isNumberBodyValue(element.value)) return true
    if (isNumberUnitValue(element.value, customSuffixList)) continue
    return false
  }
  return false
}

/** 判断当前元素是否属于数字单位组合的单位后缀。 */
export function isNumberUnitSuffixElement(
  elementList: IElement[],
  index: number,
  customSuffixList: string[] = []
) {
  const element = elementList[index]
  if (!element || !isPlainTextElement(element)) return false
  return (
    (NUMBER_UNIT_SUFFIX_SET.has(element.value) ||
      customSuffixList.includes(element.value)) &&
    hasNumberBodyBeforeUnitSuffix(elementList, index, customSuffixList)
  )
}

/** 判断当前元素是否是需要避开行尾的开口标点。 */
export function isLineEndForbiddenOpenPunctuation(
  element: IElement | undefined,
  customOpeningPunctuationList: string[] = []
) {
  return (
    !!element &&
    isPlainTextElement(element) &&
    (LINE_END_FORBIDDEN_OPEN_PUNCTUATION_SET.has(element.value) ||
      customOpeningPunctuationList.includes(element.value))
  )
}

/** 判断当前元素是否是需要避开行首的闭口标点。 */
export function isLineStartForbiddenClosingPunctuation(
  element: IElement | undefined,
  customClosingPunctuationList: string[] = []
) {
  return (
    !!element &&
    isPlainTextElement(element) &&
    (LINE_START_FORBIDDEN_PUNCTUATION_SET.has(element.value) ||
      customClosingPunctuationList.includes(element.value))
  )
}

/** 判断当前普通文本是否可作为行尾悬挂标点。 */
export function shouldHangLineEndPunctuation(element: IElement | undefined) {
  return (
    !!element && isPlainTextElement(element) && PUNCTUATION_LIST.includes(element.value)
  )
}

/** 判断两个相邻普通文本元素之间是否需要追加中西文间距。 */
export function shouldApplyCjkLatinSpacing(
  preElement: IElement | undefined,
  element: IElement | undefined
) {
  if (
    !preElement ||
    !element ||
    !isPlainTextElement(preElement) ||
    !isPlainTextElement(element)
  ) {
    return false
  }
  const preValue = preElement.value
  const value = element.value
  return (
    (CHINESE_REG.test(preValue) && LATIN_OR_NUMBER_REG.test(value)) ||
    (LATIN_OR_NUMBER_REG.test(preValue) && CHINESE_REG.test(value))
  )
}
