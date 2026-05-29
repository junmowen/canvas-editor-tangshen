import { EditorZone } from '../dataset/enum/Editor'
import { IElement, IElementFillRect, IElementStyle } from './Element'

/** 范围契约，用于约束公开 API中传递的数据结构。 */
export interface IRange {
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
  /** 是否跨行列选择，用于判断表格选区形态。 */
  isCrossRowCol?: boolean
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
  /** 起始单元格索引，用于限定表格遍历入口。 */
  startTdIndex?: number
  /** 结束td索引，用于定位对应元素、行或片段。 */
  endTdIndex?: number
  /** 起始表格行索引，用于限定表格遍历入口。 */
  startTrIndex?: number
  /** 结束tr索引，用于定位对应元素、行或片段。 */
  endTrIndex?: number
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
}

/** 范围行array，描述按行或按范围组织的数组结构。 */
export type RangeRowArray = Map<number, number[]>

/** 范围行map，描述事件名、键名或索引到处理数据的映射关系。 */
export type RangeRowMap = Map<number, Set<number>>

/** 范围rect，描述选区、元素或页面中的矩形区域。 */
export type RangeRect = IElementFillRect

/** 范围上下文，汇总流程中需要共享的定位、状态和依赖。 */
export type RangeContext = {
  /** 选区是否折叠，用于区分光标和范围选择。 */
  isCollapsed: boolean
  /** 起始元素，用于标记范围左边界对应的文档元素。 */
  startElement: IElement
  /** 结束元素，用于标记范围右边界对应的文档元素。 */
  endElement: IElement
  /** 起始页码，用于限定跨页范围的左边界。 */
  startPageNo: number
  /** 结束页码，用于限定跨页范围的右边界。 */
  endPageNo: number
  /** 起始行no，用于定位对应页、行或序号。 */
  startRowNo: number
  /** 结束行no，用于定位对应页、行或序号。 */
  endRowNo: number
  /** 起始paragraphno，用于定位对应页、行或序号。 */
  startParagraphNo: number
  /** 起始colno，用于定位对应页、行或序号。 */
  startColNo: number
  /** 结束colno，用于定位对应页、行或序号。 */
  endColNo: number
  /** 范围rects列表，保存同类数据的有序集合。 */
  rangeRects: RangeRect[]
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone: EditorZone
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable: boolean
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number | null
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number | null
  /** 表格元素对象，作为表格遍历和渲染的入口。 */
  tableElement: IElement | null
  /** 选区文本，保存需要渲染、搜索或复制的文本内容。 */
  selectionText: string | null
  selectionElementList: IElement[]
  /** 标题id，用于关联对应业务对象。 */
  titleId: string | null
  /** 标题起始页面no，用于定位对应页、行或序号。 */
  titleStartPageNo: number | null
}

/** 范围paragraphinfo契约，用于约束公开 API中传递的数据结构。 */
export interface IRangeParagraphInfo {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
}

/** 范围元素样式，描述文字、边框或背景等显示效果。 */
export type IRangeElementStyle = Pick<
  IElementStyle,
  | 'bold'
  | 'color'
  | 'highlight'
  | 'font'
  | 'size'
  | 'italic'
  | 'underline'
  | 'strikeout'
>
