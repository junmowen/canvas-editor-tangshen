import { AreaMode } from '../dataset/enum/Area'
import { LocationPosition } from '../dataset/enum/Common'
import { IElement, IElementPosition } from './Element'
import { IPlaceholder } from './Placeholder'
import { IRange } from './Range'

/** 区域基础信息，保存该对象最小必要配置。 */
export interface IAreaBasic {
  /** 扩展数据对象，用于承载业务侧自定义字段。 */
  extension?: unknown
  /** 占位内容，用于在空值或待输入状态下显示提示。 */
  placeholder?: IPlaceholder
}

/** 区域样式，描述文字、边框或背景等显示效果。 */
export interface IAreaStyle {
  /** 上侧偏移或边距，用于计算区域边界。 */
  top?: number
  /** 边框颜色，用于绘制元素或表格边线。 */
  borderColor?: string
  /** 背景颜色，用于填充元素或区域底色。 */
  backgroundColor?: string
}

/** 区域规则，控制该能力的启用条件和约束。 */
export interface IAreaRule {
  /** 模式标识，用于选择当前处理分支。 */
  mode?: AreaMode
  /** 是否隐藏，用于控制界面项或元素可见性。 */
  hide?: boolean
  /** 是否允许删除，用于控制控件或元素的删除权限。 */
  deletable?: boolean
}

/** 区域类型，用于约束公开 API中传递的数据结构。 */
export type IArea = IAreaBasic & IAreaStyle & IAreaRule

/** 插入区域选项，用于约束调用方可传入的可选配置。 */
export interface IInsertAreaOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 编辑区域标识，区分正文、页眉、页脚等独立区域。 */
  area: IArea
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: IElement[]
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position?: LocationPosition
  /** 选区范围，记录起止索引和方向信息。 */
  range?: Pick<IRange, 'startIndex' | 'endIndex'>
}

/** 设置区域值选项，用于约束调用方可传入的可选配置。 */
export interface ISetAreaValueOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: IElement[]
}

/** 设置区域properties选项，用于约束调用方可传入的可选配置。 */
export interface ISetAreaPropertiesOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 属性集合，用于批量携带元素样式或业务配置。 */
  properties: IArea
}

/** 删除区域选项，用于约束调用方可传入的可选配置。 */
export interface IDeleteAreaOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
}

/** 获取区域值选项，用于约束调用方可传入的可选配置。 */
export interface IGetAreaValueOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
}

export interface IGetAreaValueResult {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 编辑区域标识，区分正文、页眉、页脚等独立区域。 */
  area: IArea
  /** 起始页码，用于限定跨页范围的左边界。 */
  startPageNo: number
  /** 结束页码，用于限定跨页范围的右边界。 */
  endPageNo: number
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: IElement[]
}

/** 区域info契约，用于约束公开 API中传递的数据结构。 */
export interface IAreaInfo {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id: string
  /** 编辑区域标识，区分正文、页眉、页脚等独立区域。 */
  area: IArea
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
}

/** location区域选项，用于约束调用方可传入的可选配置。 */
export interface ILocationAreaOption {
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: LocationPosition
  isAppendLastLineBreak?: boolean
}
