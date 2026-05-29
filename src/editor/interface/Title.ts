import { EditorZone } from '../dataset/enum/Editor'
import { IElement } from './Element'

/** 标题size选项，用于约束调用方可传入的可选配置。 */
export interface ITitleSizeOption {
  /** 一级标题默认字号。 */
  defaultFirstSize?: number
  /** 二级标题默认字号。 */
  defaultSecondSize?: number
  /** 三级标题默认字号。 */
  defaultThirdSize?: number
  /** 四级标题默认字号。 */
  defaultFourthSize?: number
  /** 五级标题默认字号。 */
  defaultFifthSize?: number
  /** 六级标题默认字号。 */
  defaultSixthSize?: number
}

/** 标题选项，用于约束调用方可传入的可选配置。 */
export type ITitleOption = ITitleSizeOption & {}

/** 标题规则，控制该能力的启用条件和约束。 */
export interface ITitleRule {
  /** 是否允许删除，用于控制控件或元素的删除权限。 */
  deletable?: boolean
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
}

/** 标题类型，用于约束公开 API中传递的数据结构。 */
export type ITitle = ITitleRule & {
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
}

/** 获取标题值选项，用于约束调用方可传入的可选配置。 */
export interface IGetTitleValueOption {
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId: string
}

export type IGetTitleValueResult = (ITitle & {
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string | null
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone: EditorZone
})[]
