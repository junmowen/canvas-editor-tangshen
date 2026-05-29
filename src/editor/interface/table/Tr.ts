import { ITd } from './Td'

/** tr契约，用于约束公开 API中传递的数据结构。 */
export interface ITr {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 扩展数据对象，用于承载业务侧自定义字段。 */
  extension?: unknown
  /** 外部系统标识，用于和业务数据源建立关联。 */
  externalId?: string
  /** 分页前原始行 id。 */
  pagingOriginId?: string
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 单元格列表，保存当前行内的单元格结构。 */
  tdList: ITd[]
  /** 表格行最小高度。 */
  minHeight?: number
  /** 标记该行是否是分页片段中的重复承接行。 */
  pagingRepeat?: boolean
  /** 标记该行在表格跨页时是否作为页首重复表头。 */
  repeatOnPageStart?: boolean
  /** 分页前原始行高。 */
  pagingOriginHeight?: number
}
