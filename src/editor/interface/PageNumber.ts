import { NumberType } from '../dataset/enum/Common'
import { RowFlex } from '../dataset/enum/Row'

/** 页面number契约，用于约束公开 API中传递的数据结构。 */
export interface IPageNumber {
  /** 下侧偏移或边距，用于计算区域边界。 */
  bottom?: number
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size?: number
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font?: string
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 行剩余弹性空间，用于分配两端对齐或缩进补偿。 */
  rowFlex?: RowFlex
  /** format文本，用于标识、展示或匹配当前对象。 */
  format?: string
  numberType?: NumberType
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
  /** 起始页码，用于限定跨页范围的左边界。 */
  startPageNo?: number
  /** 来源页码，用于描述迁移或重排前所在页面。 */
  fromPageNo?: number
  /** 最大页面no，用于定位对应页、行或序号。 */
  maxPageNo?: number | null
}
