import { MaxHeightRatio } from '../enum/Common'

// 零宽占位字符，用于表示空文本节点或占位元素。
export const ZERO = '\u200B'
// 换行符常量，用于文本拆分和换行元素转换。
export const WRAP = '\n'
// 水平制表符常量，用于 Tab 输入和缩进计算。
export const HORIZON_TAB = '\t'
// HTML 非换行空格实体，用于保留连续空格显示。
export const NBSP = '\u0020'
// 非换行空格字符，用于文本宽度和空格渲染。
export const NON_BREAKING_SPACE = '&nbsp;'
// 常用中英文标点列表，用于标点悬挂和文本边界判断。
export const PUNCTUATION_LIST = [
  '·',
  '、',
  ':',
  '：',
  ',',
  '，',
  '.',
  '。',
  ';',
  '；',
  '?',
  '？',
  '!',
  '！'
]

// 最大高度比例到数值的映射，用于计算页眉页脚可占页面高度。
export const maxHeightRadioMapping: Record<MaxHeightRatio, number> = {
  [MaxHeightRatio.HALF]: 1 / 2,
  [MaxHeightRatio.ONE_THIRD]: 1 / 3,
  [MaxHeightRatio.QUARTER]: 1 / 4
}

// 多语言字母字符集配置，用于构建词边界匹配正则。
export const LETTER_CLASS = {
  ENGLISH: 'A-Za-z',
  SPANISH: 'A-Za-zÁÉÍÓÚáéíóúÑñÜü',
  FRENCH: 'A-Za-zÀÂÇàâçÉéÈèÊêËëÎîÏïÔôÙùÛûŸÿ',
  GERMAN: 'A-Za-zÄäÖöÜüß',
  RUSSIAN: 'А-Яа-яЁё',
  PORTUGUESE: 'A-Za-zÁÉÍÓÚáéíóúÃÕãõÇç',
  ITALIAN: 'A-Za-zÀàÈèÉéÌìÍíÎîÓóÒòÙù',
  DUTCH: 'A-Za-zÀàÁáÂâÄäÈèÉéÊêËëÌìÍíÎîÏïÓóÒòÔôÖöÙùÛûÜü',
  SWEDISH: 'A-Za-zÅåÄäÖö',
  GREEK: 'ΑαΒβΓγΔδΕεΖζΗηΘθΙιΚκΛλΜμΝνΞξΟοΠπΡρΣσςΤτΥυΦφΧχΨψΩω'
}

// 文本度量基准字符，用于估算字体指标。
export const METRICS_BASIS_TEXT = '日'
