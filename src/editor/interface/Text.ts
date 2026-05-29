import { TextDecorationStyle } from '../dataset/enum/Text'

/** 文本metrics契约，用于约束公开 API中传递的数据结构。 */
export interface ITextMetrics {
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** actualboundingboxascent数值，用于当前布局、统计或索引计算。 */
  actualBoundingBoxAscent: number
  /** actualboundingboxdescent数值，用于当前布局、统计或索引计算。 */
  actualBoundingBoxDescent: number
  /** actualboundingbox左侧数值，用于当前布局、统计或索引计算。 */
  actualBoundingBoxLeft: number
  /** actualboundingbox右侧数值，用于当前布局、统计或索引计算。 */
  actualBoundingBoxRight: number
  /** fontboundingboxascent数值，用于当前布局、统计或索引计算。 */
  fontBoundingBoxAscent: number
  /** fontboundingboxdescent数值，用于当前布局、统计或索引计算。 */
  fontBoundingBoxDescent: number
}

/** 文本decoration契约，用于约束公开 API中传递的数据结构。 */
export interface ITextDecoration {
  /** 样式配置，用于描述元素或控件的显示效果。 */
  style?: TextDecorationStyle
}
