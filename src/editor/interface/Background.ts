import { BackgroundRepeat, BackgroundSize } from '../dataset/enum/Background'

/** 背景选项，用于约束调用方可传入的可选配置。 */
export interface IBackgroundOption {
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 图片文本，用于标识、展示或匹配当前对象。 */
  image?: string
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size?: BackgroundSize
  /** 是否重复，用于控制背景、页眉页脚或水印复用。 */
  repeat?: BackgroundRepeat
  /** apply页面numbers数值，用于当前布局、统计或索引计算。 */
  applyPageNumbers?: number[]
}
