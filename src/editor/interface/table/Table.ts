import { IPadding } from '../Common'

/** 表格选项，用于约束调用方可传入的可选配置。 */
export interface ITableOption {
  /** 单元格内边距，用于计算表格内容可用空间。 */
  tdPadding?: IPadding
  /** 表格行默认最小高度。 */
  defaultTrMinHeight?: number
  /** 表格列默认最小宽度。 */
  defaultColMinWidth?: number
  /** 默认边框颜色，用于控制绘制外观。 */
  defaultBorderColor?: string
}
