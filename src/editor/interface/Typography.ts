/** 中文排版细节配置，用于扩展断行、单位和标点禁则。 */
export interface ITypographyOption {
  /** 数字后允许视为不可拆分单位后缀的自定义字符列表。 */
  numberUnitSuffixList?: string[]
  /** 不允许停留在行尾的自定义开口标点列表。 */
  openingPunctuationList?: string[]
  /** 不允许独立出现在行首的自定义闭口或句读标点列表。 */
  closingPunctuationList?: string[]
  /** 中文与英文/数字相邻时追加的间距，使用编辑器内部像素单位。 */
  cjkLatinSpacing?: number
}
