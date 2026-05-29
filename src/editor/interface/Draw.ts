import { ImageDisplay } from '../dataset/enum/Common'
import { EditorMode, EditorZone } from '../dataset/enum/Editor'
import { IElement, IElementPosition } from './Element'
import { IRow } from './Row'

/** 绘制选项，用于约束调用方可传入的可选配置。 */
export interface IDrawOption {
  /** 当前元素索引，用于记录遍历或命中过程的位置。 */
  curIndex?: number
  /** 是否同步设置光标，用于控制操作完成后的焦点位置。 */
  isSetCursor?: boolean
  /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
  isSubmitHistory?: boolean
  /** 是否执行计算流程，用于控制布局或统计是否重新生成。 */
  isCompute?: boolean
  /** 是否延迟执行，用于把计算或渲染推迟到合适时机。 */
  isLazy?: boolean
  /** 页面渲染范围，用于限制本次刷新涉及的页码区间。 */
  pageRenderScope?: 'all' | 'visible'
  /** 布局补丁信息，用于描述本次增量排版变更。 */
  layoutPatch?: IDrawLayoutPatch
  /** 输入态渲染标记，用于跳过无收益的 bitmap 写入等后台优化。 */
  isTyping?: boolean
  /** 输入态插入元素数量，用于 chunk patch 扩展新测量范围。 */
  typingInsertedCount?: number
  /** 输入态编辑锚点，用于在光标右移或删除后仍命中原始 chunk。 */
  typingEditIndex?: number
  /** 是否跳过输入预览绘制，程序化批量插入可直接走 chunk runtime patch。 */
  isSkipTypingPreview?: boolean
  /** 输入态立即回放标记，用于回车等结构变化操作。 */
  isImmediateTypingCompute?: boolean
  /** 是否初始化阶段，用于区分首次构建和后续更新。 */
  isInit?: boolean
  /** 是否来自历史记录，用于区分撤销重做和普通编辑。 */
  isSourceHistory?: boolean
  /** 是否首次渲染，用于区分初始化和增量刷新。 */
  isFirstRender?: boolean
}

/** 绘制布局补丁契约，用于约束公开 API中传递的数据结构。 */
export interface IDrawLayoutPatch {
  type: 'text-input'
  /** 插入索引，用于定位新元素写入位置。 */
  insertIndex: number
  /** 插入数量，用于描述本次新增元素规模。 */
  insertCount: number
  /** 行索引，用于定位表格或页面中的目标行。 */
  rowIndex: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
}

/** forceupdate选项，用于约束调用方可传入的可选配置。 */
export interface IForceUpdateOption {
  /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
  isSubmitHistory?: boolean
}

/** 绘制图片调用载荷，聚合执行该操作所需的输入数据。 */
export interface IDrawImagePayload {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string
  /** 图片显示配置，用于描述图片在页面中的尺寸和位置。 */
  imgDisplay?: ImageDisplay
  /** 扩展数据对象，用于承载业务侧自定义字段。 */
  extension?: unknown
}

/** 绘制行调用载荷，聚合执行该操作所需的输入数据。 */
export interface IDrawRowPayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
  /** 行列表，保存排版后的行结构。 */
  rowList: IRow[]
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 内部可用宽度，用于排版时扣除边距或缩进。 */
  innerWidth: number
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
  /** 是否绘制换行符，用于控制格式标记显示。 */
  isDrawLineBreak?: boolean
  /** 导出绘制标记：禁用 DOM/WebGL 运行时副作用，走稳定 Canvas2D fallback。 */
  isExport?: boolean
  /** 选区绘制上下文，用于在页面上渲染当前选择状态。 */
  selectionCtx?: CanvasRenderingContext2D | null
  /** 表格单元格上下文，保存命中单元格及其逻辑位置。 */
  tableCellContext?: {
    /** 表格标识，用于关联表格片段、行和单元格。 */
    tableId: string
    /** 表格行标识，用于关联行位置、片段和选区。 */
    trId: string
    /** 单元格标识，用于关联单元格位置、片段和选区。 */
    tdId: string
    /** 表格行索引，用于定位当前表格内的目标行。 */
    trIndex: number
    /** 单元格索引，用于定位当前行内的目标单元格。 */
    tdIndex: number
  }
}

/** 绘制float调用载荷，聚合执行该操作所需的输入数据。 */
export interface IDrawFloatPayload {
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 图片显示配置列表，用于保存当前页内图片的显示状态。 */
  imgDisplays: ImageDisplay[]
  /** 仅渲染指定区域的浮动元素；不传则按页码并兼容页眉页脚浮动元素。 */
  zoneList?: EditorZone[]
  /** 未指定 zoneList 时，是否同时渲染页眉页脚浮动元素。 */
  includeHeaderFooter?: boolean
  /** 导出绘制标记：浮动图片也需要禁用 WebGL 运行时路径。 */
  isExport?: boolean
}

/** 绘制页面调用载荷，聚合执行该操作所需的输入数据。 */
export interface IDrawPagePayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
  /** 行列表，保存排版后的行结构。 */
  rowList: IRow[]
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 导出绘制标记：禁用 DOM/WebGL 运行时副作用，走稳定 Canvas2D fallback。 */
  isExport?: boolean
}

/** painter选项，用于约束调用方可传入的可选配置。 */
export interface IPainterOption {
  /** 是否双击触发，用于区分单击和双击选择行为。 */
  isDblclick: boolean
}

/** 获取值选项，用于约束调用方可传入的可选配置。 */
export interface IGetValueOption {
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo?: number
  /** 额外提取属性列表，用于扩展元素克隆或格式提取范围。 */
  extraPickAttrs?: Array<keyof IElement>
}

/** 获取origin值选项，用于约束调用方可传入的可选配置。 */
export type IGetOriginValueOption = Omit<IGetValueOption, 'extraPickAttrs'>

/** append元素列表选项，用于约束调用方可传入的可选配置。 */
export interface IAppendElementListOption {
  /** 是否向前插入，用于控制新内容追加到范围前侧。 */
  isPrepend?: boolean
  /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
  isSubmitHistory?: boolean
}

/** 获取图片选项，用于约束调用方可传入的可选配置。 */
export interface IGetImageOption {
  /** 像素比例，用于导出或渲染时控制清晰度。 */
  pixelRatio?: number
  /** 模式标识，用于选择当前处理分支。 */
  mode?: EditorMode
}

/** 计算行列表调用载荷，聚合执行该操作所需的输入数据。 */
export interface IComputeRowListPayload {
  /** 内部可用宽度，用于排版时扣除边距或缩进。 */
  innerWidth: number
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 起始横坐标，用于记录拖拽、绘制或选择的起点。 */
  startX?: number
  /** 起始纵坐标，用于记录拖拽、绘制或选择的起点。 */
  startY?: number
  /** 是否浮动元素，用于选择环绕和定位计算逻辑。 */
  isFloat?: boolean
  /** 是否来源于表格，用于选择表格内专用排版路径。 */
  isFromTable?: boolean
  /** 兼容旧布局链路的分页模式字段。 */
  isPagingMode?: boolean
  /** 是否分页页面模式，用于选择分页或连续布局逻辑。 */
  isPagingPageMode?: boolean
  /** 页面高度，用于计算分页模式下的可视区域。 */
  pageHeight?: number
  /** 主编辑区外部高度，用于计算连续模式可视范围。 */
  mainOuterHeight?: number
  /** 环绕元素列表，保存影响浮动内容排版的元素。 */
  surroundElementList?: IElement[]
  /** elementList 是主文档局部切片时，对应整篇正文的起始索引。 */
  sourceStartIndex?: number
}
