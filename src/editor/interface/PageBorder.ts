import { IPadding } from './Common'

/** 页面边框样式，描述文字、边框或背景等显示效果。 */
export type PageBorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'art'

/** 页面边框选项，用于约束调用方可传入的可选配置。 */
export interface IPageBorderOption {
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 线宽，用于设置 Canvas 描边粗细。 */
  lineWidth?: number
  padding?: IPadding
  /** 样式配置，用于描述元素或控件的显示效果。 */
  style?: PageBorderStyle
  /** 虚线间隔配置，用于绘制虚线或点划线边框。 */
  dashArray?: number[]
  /** 艺术边框素材尺寸，仅在 style 为 art 时参与边框绘制。 */
  artSize?: number
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
}
