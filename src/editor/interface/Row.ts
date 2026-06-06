import { RowFlex } from '../dataset/enum/Row'
import { IElement, IElementMetrics } from './Element'
import { IPageColumns } from './PageColumns'
import { ITableFragmentDescriptor } from './table/TableFragment'

/** 行元素，描述文档元素在该场景下扩展的业务属性。 */
export type IRowElement = IElement & {
  /** 统计指标集合，用于暴露渲染或布局运行状态。 */
  metrics: IElementMetrics
  /** 样式配置，用于描述元素或控件的显示效果。 */
  style: string
  /** 左侧偏移或边距，用于计算区域边界。 */
  left?: number
}

/** 行契约，用于约束公开 API中传递的数据结构。 */
export interface IRow {
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 字体上升高度，用于计算文本基线和行高。 */
  ascent: number
  /** 行剩余弹性空间，用于分配两端对齐或缩进补偿。 */
  rowFlex?: RowFlex
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 是否页面break，用于控制当前流程的判断分支。 */
  isPageBreak?: boolean
  /** 是否列表，用于控制当前流程的判断分支。 */
  isList?: boolean
  /** 列表索引，用于定位对应元素、行或片段。 */
  listIndex?: number
  /** 横向偏移量，用于调整绘制或命中位置。 */
  offsetX?: number
  /** 行flex偏移x数值，用于当前布局、统计或索引计算。 */
  rowFlexOffsetX?: number
  /** 右侧偏移x数值，用于当前布局、统计或索引计算。 */
  rightOffsetX?: number
  /** 纵向偏移量，用于调整绘制或命中位置。 */
  offsetY?: number
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IRowElement[]
  /** 是否宽度notenough，用于控制当前流程的判断分支。 */
  isWidthNotEnough?: boolean
  /** 行索引，用于定位表格或页面中的目标行。 */
  rowIndex: number
  /** 栏索引，用于记录当前行在页面分栏中的落位。 */
  columnIndex?: number
  /** 行所属的局部分栏配置，为空时使用页面全局分栏配置。 */
  columns?: IPageColumns
  /** 当前分栏小节的纵向起点，用于选中内容分栏从正文中间开始排版。 */
  columnStartY?: number
  /** 是否环绕元素，用于行布局中处理浮动内容占位。 */
  isSurround?: boolean
  tableFragment?: ITableFragmentDescriptor
}
