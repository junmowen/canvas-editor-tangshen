import { LineNumberType } from '../dataset/enum/LineNumber'

/** 行number选项，用于约束调用方可传入的可选配置。 */
export interface ILineNumberOption {
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size?: number
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font?: string
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
  /** 右侧偏移或边距，用于计算区域边界。 */
  right?: number
  type?: LineNumberType
}
