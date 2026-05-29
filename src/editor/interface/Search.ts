import { EditorContext } from '../dataset/enum/Editor'
import { IElementPosition } from './Element'
import { IRange } from './Range'

/** 搜索结果基础信息，保存该对象最小必要配置。 */
export interface ISearchResultBasic {
  type: EditorContext
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 分组id，用于关联对应业务对象。 */
  groupId: string
}

/** 搜索结果restargs契约，用于约束公开 API中传递的数据结构。 */
export interface ISearchResultRestArgs {
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex?: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 单元格标识，用于关联单元格位置、片段和选区。 */
  tdId?: string
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex?: number
}

export type ISearchResult = ISearchResultBasic & ISearchResultRestArgs

/** 搜索结果上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface ISearchResultContext {
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 起始坐标，用于记录拖拽或选区开始位置。 */
  startPosition: IElementPosition
  /** 结束位置，用于描述布局或命中的空间范围。 */
  endPosition: IElementPosition
}

/** replace选项，用于约束调用方可传入的可选配置。 */
export interface IReplaceOption {
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index?: number
}

/** 搜索选项，用于约束调用方可传入的可选配置。 */
export interface ISearchOption {
  /** 是否启用正则匹配，用于搜索时切换普通文本和正则模式。 */
  isRegEnable?: boolean
  /** 是否忽略case，用于控制当前流程的判断分支。 */
  isIgnoreCase?: boolean
  /** 是否限制在选区内，用于搜索或替换时缩小处理范围。 */
  isLimitSelection?: boolean
}
