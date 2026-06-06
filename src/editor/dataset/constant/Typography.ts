import { ITypographyOption } from '../../interface/Typography'

/** 默认中文排版细节配置，保持旧文档无额外传参也能启用基础专业断行规则。 */
export const defaultTypographyOption: Required<ITypographyOption> = {
  numberUnitSuffixList: [],
  openingPunctuationList: [],
  closingPunctuationList: [],
  cjkLatinSpacing: 0
}
