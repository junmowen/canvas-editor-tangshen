import { EditorZone } from '../dataset/enum/Editor'
import { TitleLevel } from '../dataset/enum/Title'
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

/** 标题树节点，描述标题在长文档章节结构中的稳定父子关系。 */
export interface ITitleTreeNode {
  /** 标题唯一标识，来源于标题元素的 titleId。 */
  id: string
  /** 标题文本，已去除零宽占位字符。 */
  name: string
  /** 标题级别，按一到六级标题参与父子关系计算。 */
  level: TitleLevel
  /** 父标题 id；顶级标题为 null。 */
  parentTitleId: string | null
  /** 子标题 id 列表，保持文档出现顺序。 */
  childrenTitleIds: string[]
  /** 子标题节点列表，便于业务侧直接按树遍历。 */
  childList: ITitleTreeNode[]
  /** 从根标题到当前标题的 id 路径。 */
  path: string[]
  /** 当前标题在整篇标题列表中的顺序，从 0 开始。 */
  order: number
  /** 当前标题在标题树中的深度，顶级标题为 0。 */
  depth: number
  /** 标题起始元素索引；表格内标题为单元格局部索引。 */
  startIndex: number
  /** 标题结束元素索引；表格内标题为单元格局部索引。 */
  endIndex: number
  /** 当前章节范围起始索引，包含标题自身；表格内标题为单元格局部索引。 */
  rangeStartIndex: number
  /** 当前章节范围结束索引，包含下一个同级或更高级标题前的正文内容。 */
  rangeEndIndex: number
  /** 当前章节正文起始索引，不包含标题自身；当大于 contentEndIndex 时表示无正文。 */
  contentStartIndex: number
  /** 当前章节正文结束索引；当小于 contentStartIndex 时表示无正文。 */
  contentEndIndex: number
  /** 结束当前章节范围的下一个同级或更高级标题 id；没有后续边界时为 null。 */
  nextBoundaryTitleId: string | null
  /** 标题起始页码；无法定位时为 null。 */
  pageNo: number | null
  /** 表格 id；标题不在表格中时为空。 */
  tableId?: string
  /** 表格行索引；标题不在表格中时为空。 */
  trIndex?: number
  /** 表格单元格索引；标题不在表格中时为空。 */
  tdIndex?: number
}

/** 标题树查询结果，包含树形结构和扁平结构两种视图。 */
export interface ITitleTree {
  /** 顶级标题节点列表。 */
  rootList: ITitleTreeNode[]
  /** 按文档顺序排列的全部标题节点列表。 */
  nodeList: ITitleTreeNode[]
}

/** 标题章节范围，供按章导出、章节拖拽和业务侧批量操作复用。 */
export interface ITitleTreeRange {
  /** 标题唯一标识。 */
  titleId: string
  /** 当前章节范围起始索引，包含标题自身。 */
  startIndex: number
  /** 当前章节范围结束索引，包含下一个边界标题前的内容。 */
  endIndex: number
  /** 当前章节正文起始索引，不包含标题自身。 */
  contentStartIndex: number
  /** 当前章节正文结束索引。 */
  contentEndIndex: number
  /** 结束当前章节范围的下一个同级或更高级标题 id；没有后续边界时为 null。 */
  nextBoundaryTitleId: string | null
  /** 表格 id；标题不在表格中时为空。 */
  tableId?: string
  /** 表格行索引；标题不在表格中时为空。 */
  trIndex?: number
  /** 表格单元格索引；标题不在表格中时为空。 */
  tdIndex?: number
  /** 当前章节元素列表，按正文顺序克隆返回；表格内标题暂返回空数组，调用方可结合 tableId/trIndex/tdIndex 处理局部单元格。 */
  elementList: IElement[]
}
