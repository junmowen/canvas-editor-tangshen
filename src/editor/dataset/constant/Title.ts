import { ITitleOption, ITitleSizeOption } from '../../interface/Title'
import { TitleLevel } from '../enum/Title'

export const defaultTitleOption: Readonly<Required<ITitleOption>> = {
  defaultFirstSize: 26,
  defaultSecondSize: 24,
  defaultThirdSize: 22,
  defaultFourthSize: 20,
  defaultFifthSize: 18,
  defaultSixthSize: 16
}

// 标题层级到字号的映射，用于初始化各级标题默认大小。
export const titleSizeMapping: Record<TitleLevel, keyof ITitleSizeOption> = {
  [TitleLevel.FIRST]: 'defaultFirstSize',
  [TitleLevel.SECOND]: 'defaultSecondSize',
  [TitleLevel.THIRD]: 'defaultThirdSize',
  [TitleLevel.FOURTH]: 'defaultFourthSize',
  [TitleLevel.FIFTH]: 'defaultFifthSize',
  [TitleLevel.SIXTH]: 'defaultSixthSize'
}

// 标题层级到序号权重的映射，用于目录排序和层级比较。
export const titleOrderNumberMapping: Record<TitleLevel, number> = {
  [TitleLevel.FIRST]: 1,
  [TitleLevel.SECOND]: 2,
  [TitleLevel.THIRD]: 3,
  [TitleLevel.FOURTH]: 4,
  [TitleLevel.FIFTH]: 5,
  [TitleLevel.SIXTH]: 6
}

// 标题层级到 HTML 标签名的映射，用于导出 h1 到 h6 节点。
export const titleNodeNameMapping: Record<string, TitleLevel> = {
  H1: TitleLevel.FIRST,
  H2: TitleLevel.SECOND,
  H3: TitleLevel.THIRD,
  H4: TitleLevel.FOURTH,
  H5: TitleLevel.FIFTH,
  H6: TitleLevel.SIXTH
}
