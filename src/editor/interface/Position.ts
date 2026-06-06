import { ImageDisplay } from '../dataset/enum/Common'
import { EditorZone } from '../dataset/enum/Editor'
import { IElement, IElementFillRect, IElementPosition } from './Element'
import { IRange } from './Range'
import { IRow, IRowElement } from './Row'

/** 当前位置契约，用于约束公开 API中传递的数据结构。 */
export interface ICurrentPosition {
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 光标坐标信息，用于渲染插入点或处理命中。 */
  cursorPosition?: IElementPosition
  /** 左侧是否为空白，用于判断行首或单元格起始位置。 */
  isLeftSideBlank?: boolean
  /** 命中目标索引，用于定位指针事件落点对应的元素。 */
  hitTargetIndex?: number
  /** 横坐标，用于定位画布或页面内的位置。 */
  x?: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y?: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo?: number
  /** 是否复选框，用于控制当前流程的判断分支。 */
  isCheckbox?: boolean
  /** 是否单选框，用于控制当前流程的判断分支。 */
  isRadio?: boolean
  /** 是否控件，用于控制当前流程的判断分支。 */
  isControl?: boolean
  /** 是否图片，用于控制当前流程的判断分支。 */
  isImage?: boolean
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable?: boolean
  /** 是否直接命中，用于控制当前流程的判断分支。 */
  isDirectHit?: boolean
  /** 是否命中公式边缘扩展区，用于区分落光标和打开公式编辑器。 */
  isFormulaEdgeHit?: boolean
  /** forcenot右侧boundary命中开关，用于控制当前流程的判断分支。 */
  forceNotRightBoundaryHit?: boolean
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 单元格内容索引，用于定位单元格内部元素。 */
  tdValueIndex?: number
  /** 单元格标识，用于关联单元格位置、片段和选区。 */
  tdId?: string
  /** 表格行标识，用于关联行位置、片段和选区。 */
  trId?: string
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
}

/** 获取位置byxy调用载荷，聚合执行该操作所需的输入数据。 */
export interface IGetPositionByXYPayload {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo?: number
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList?: IElement[]
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList?: IElementPosition[]
}

/** 获取float位置byxy调用载荷，聚合执行该操作所需的输入数据。 */
export type IGetFloatPositionByXYPayload = IGetPositionByXYPayload & {
  /** 图片显示配置列表，用于保存当前页内图片的显示状态。 */
  imgDisplays: ImageDisplay[]
}

/** 位置上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface IPositionContext {
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable: boolean
  /** 是否复选框，用于控制当前流程的判断分支。 */
  isCheckbox?: boolean
  /** 是否单选框，用于控制当前流程的判断分支。 */
  isRadio?: boolean
  /** 是否控件，用于控制当前流程的判断分支。 */
  isControl?: boolean
  /** 是否图片，用于控制当前流程的判断分支。 */
  isImage?: boolean
  /** 是否直接命中，用于控制当前流程的判断分支。 */
  isDirectHit?: boolean
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index?: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 单元格标识，用于关联单元格位置、片段和选区。 */
  tdId?: string
  /** 表格行标识，用于关联行位置、片段和选区。 */
  trId?: string
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
}

/** 计算行位置调用载荷，聚合执行该操作所需的输入数据。 */
export interface IComputeRowPositionPayload {
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 内部可用宽度，用于排版时扣除边距或缩进。 */
  innerWidth: number
}

/** 计算页面行位置调用载荷，聚合执行该操作所需的输入数据。 */
export interface IComputePageRowPositionPayload {
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
  /** 行列表，保存排版后的行结构。 */
  rowList: IRow[]
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 起始行索引，用于限定表格或页面行处理范围。 */
  startRowIndex: number
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 起始横坐标，用于记录拖拽、绘制或选择的起点。 */
  startX: number
  /** 起始纵坐标，用于记录拖拽、绘制或选择的起点。 */
  startY: number
  /** 内部可用宽度，用于排版时扣除边距或缩进。 */
  innerWidth: number
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable?: boolean
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格内容索引，用于定位单元格内部元素。 */
  tdValueIndex?: number
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
}

export interface IComputePageRowPositionResult {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
}

/** float位置契约，用于约束公开 API中传递的数据结构。 */
export interface IFloatPosition {
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: IElementPosition
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable?: boolean
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格内容索引，用于定位单元格内部元素。 */
  tdValueIndex?: number
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
}

/** location位置契约，用于约束公开 API中传递的数据结构。 */
export interface ILocationPosition {
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone: EditorZone
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
}

/** 设置surround位置调用载荷，聚合执行该操作所需的输入数据。 */
export interface ISetSurroundPositionPayload {
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 行元素，用于定位或修改对应文档节点。 */
  rowElement: IRowElement
  /** 行元素rect，用于描述布局或命中的空间范围。 */
  rowElementRect: IElementFillRect
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 可用宽度，用于计算当前行或单元格的排版空间。 */
  availableWidth: number
  /** 环绕元素列表，保存影响浮动内容排版的元素。 */
  surroundElementList: IElement[]
}
