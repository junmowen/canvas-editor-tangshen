import { RowFlex } from '../dataset/enum/Row'

/** 排版矩形区域，用于描述页、栏、正文内容和段落块的边界。 */
export interface ITypesettingRect {
  /** 横坐标，使用当前渲染缩放后的编辑器内部像素。 */
  x: number
  /** 纵坐标，使用当前渲染缩放后的编辑器内部像素。 */
  y: number
  /** 宽度，使用当前渲染缩放后的编辑器内部像素。 */
  width: number
  /** 高度，使用当前渲染缩放后的编辑器内部像素。 */
  height: number
}

/** 排版段落块类型，用于区分后续分页规则需要处理的业务块。 */
export type TypesettingParagraphBlockType =
  | 'paragraph'
  | 'title'
  | 'list'
  | 'table'
  | 'page-break'
  | 'area'

/** 段落块快照，聚合一组连续行并记录参与分页规则的上下文。 */
export interface ITypesettingParagraphBlock {
  /** 段落块唯一标识，格式为 page-column-block 的稳定调试 id。 */
  id: string
  /** 段落块所属页码，从 0 开始。 */
  pageNo: number
  /** 段落块所属栏索引，从 0 开始；当前真实排版未分栏时均为 0。 */
  columnIndex: number
  /** 段落块在全局 rowList 中的起始行号。 */
  startRowIndex: number
  /** 段落块在全局 rowList 中的结束行号。 */
  endRowIndex: number
  /** 段落块覆盖的起始元素索引。 */
  startIndex: number
  /** 段落块覆盖的结束元素索引。 */
  endIndex: number
  /** 段落块包含的行数。 */
  rowCount: number
  /** 段落块在页面坐标系中的矩形区域。 */
  rect: ITypesettingRect
  /** 段落块类型，用于后续分页规则选择处理路径。 */
  type: TypesettingParagraphBlockType
  /** 段落水平对齐方式，继承段落首行信息。 */
  rowFlex?: RowFlex
  /** 标题 id，用于标题父子树和目录定位。 */
  titleId?: string
  /** 列表 id，用于列表连续编号和分组分页控制。 */
  listId?: string
  /** 表格 id，用于表格跨页和表格属性面板定位。 */
  tableId?: string
  /** 区域 id，用于区域元素跨页和业务表单定位。 */
  areaId?: string
  /** 当前块是否包含分页符。 */
  isPageBreak?: boolean
}

/** 栏快照，描述页面中的一个正文流区域。 */
export interface ITypesettingColumn {
  /** 栏所属页码，从 0 开始。 */
  pageNo: number
  /** 栏索引，从 0 开始。 */
  index: number
  /** 栏在页面坐标系中的矩形区域。 */
  rect: ITypesettingRect
  /** 当前栏内的段落块列表。 */
  paragraphBlockList: ITypesettingParagraphBlock[]
}

/** 页快照，描述页面、正文内容区和栏结构。 */
export interface ITypesettingPage {
  /** 页码，从 0 开始。 */
  pageNo: number
  /** 页面完整区域。 */
  rect: ITypesettingRect
  /** 扣除页边距、页眉页脚和页码占位后的正文内容区域。 */
  contentRect: ITypesettingRect
  /** 当前页面的栏列表。 */
  columnList: ITypesettingColumn[]
}

/** 排版布局快照，作为段落块/栏/页中间层的只读调试和后续规则承载入口。 */
export interface ITypesettingLayoutSnapshot {
  /** 快照版本，跟随布局流水线版本递增。 */
  version: number
  /** 当前布局使用的页面数量。 */
  pageCount: number
  /** 当前布局使用的全局行数量。 */
  rowCount: number
  /** 当前布局识别出的段落块数量。 */
  paragraphBlockCount: number
  /** 页结构列表。 */
  pageList: ITypesettingPage[]
  /** 扁平段落块列表，便于调试和后续按块扫描。 */
  paragraphBlockList: ITypesettingParagraphBlock[]
}
