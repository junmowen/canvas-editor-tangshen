import { VerticalAlign } from '../../dataset/enum/VerticalAlign'
import { TdBorder, TdSlash } from '../../dataset/enum/table/Table'
import { IElement, IElementPosition } from '../Element'
import { IRow } from '../Row'

/** td契约，用于约束公开 API中传递的数据结构。 */
export interface ITd {
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 扩展数据对象，用于承载业务侧自定义字段。 */
  extension?: unknown
  /** 外部系统标识，用于和业务数据源建立关联。 */
  externalId?: string
  /** 分页前原始单元格 id。 */
  pagingOriginId?: string
  /** 横坐标，用于定位画布或页面内的位置。 */
  x?: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y?: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width?: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height?: number
  /** 跨列数量，用于描述单元格横向合并范围。 */
  colspan: number
  /** rowspan数值，用于当前布局、统计或索引计算。 */
  rowspan: number
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: IElement[]
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 是否最后行td，用于控制当前流程的判断分支。 */
  isLastRowTd?: boolean
  /** 是否最后coltd，用于控制当前流程的判断分支。 */
  isLastColTd?: boolean
  /** 是否最后td，用于控制当前流程的判断分支。 */
  isLastTd?: boolean
  /** 行索引，用于定位表格或页面中的目标行。 */
  rowIndex?: number
  /** 列索引，用于定位表格中的目标列。 */
  colIndex?: number
  /** 行列表，保存排版后的行结构。 */
  rowList?: IRow[]
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList?: IElementPosition[]
  /** 垂直对齐方式，用于控制元素在行内或单元格内的位置。 */
  verticalAlign?: VerticalAlign
  textDirection?: 'horizontal' | 'vertical'
  /** 背景颜色，用于填充元素或区域底色。 */
  backgroundColor?: string
  /** 边框types列表，保存同类数据的有序集合。 */
  borderTypes?: TdBorder[]
  /** 边框颜色，用于绘制元素或表格边线。 */
  borderColor?: string
  /** 边框宽度，用于绘制元素或表格线条。 */
  borderWidth?: number
  /** slashtypes列表，保存同类数据的有序集合。 */
  slashTypes?: TdSlash[]
  /** 内容高度加内边距后的主高度。 */
  mainHeight?: number
  /** 单元格实际高度，包含跨行后的累计高度。 */
  realHeight?: number
  /** 单元格允许压缩到的最小真实高度。 */
  realMinHeight?: number
  /** 单元格内容是否不可编辑。 */
  disabled?: boolean
  /** 单元格内容是否不可删除。 */
  deletable?: boolean
}
