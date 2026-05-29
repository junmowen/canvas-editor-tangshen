import { TableBorder } from '../../dataset/enum/table/Table'
import { IColgroup } from './Colgroup'
import { ITd } from './Td'
import { ITr } from './Tr'

/** 表格片段单元格契约，用于约束公开 API中传递的数据结构。 */
export interface ITableFragmentCell extends ITd {
  /** originid，用于关联对应业务对象。 */
  originId?: string
  /** 单元格origintrid，用于关联对应业务对象。 */
  cellOriginTrId?: string
  /** 文档级起始索引，用于把局部范围换算回完整元素列表。 */
  absoluteStart?: number
  /** 文档级结束索引，用于把局部范围换算回完整元素列表。 */
  absoluteEnd?: number
}

/** 表格片段行契约，用于约束公开 API中传递的数据结构。 */
export interface ITableFragmentRow
  extends Omit<ITr, 'tdList'> {
  /** 单元格列表，保存当前行内的单元格结构。 */
  tdList: ITableFragmentCell[]
  /** repeaton页面起始开关，用于控制当前流程的判断分支。 */
  repeatOnPageStart?: boolean
  /** 表格片段拆分前的原始高度。 */
  originHeight?: number
  /** originid，用于关联对应业务对象。 */
  originId?: string
}

/** 表格片段descriptor契约，用于约束公开 API中传递的数据结构。 */
export interface ITableFragmentDescriptor {
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId: string
  /** 逻辑表格标识，用于把分页片段关联回原始表格。 */
  logicalTableId: string
  /** 逻辑表格索引，用于定位原始表格在文档中的位置。 */
  logicalTableIndex: number
  /** 片段order数值，用于当前布局、统计或索引计算。 */
  fragmentOrder: number
  /** 列组配置，用于描述表格列宽结构。 */
  colgroup?: IColgroup[]
  /** 表格行列表，保存表格的行结构。 */
  trList?: ITableFragmentRow[]
  /** 边框类型，用于选择实线、虚线等绘制方式。 */
  borderType?: TableBorder
  /** 边框颜色，用于绘制元素或表格边线。 */
  borderColor?: string
  /** 边框宽度，用于绘制元素或表格线条。 */
  borderWidth?: number
  /** 外侧边框宽度，用于计算表格外围占位。 */
  borderExternalWidth?: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 页面起始纵向偏移，用于计算表格片段在页内的位置。 */
  pageStartOffsetY?: number
}
