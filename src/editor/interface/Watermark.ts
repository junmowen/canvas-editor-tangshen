import { NumberType } from '../dataset/enum/Common'
import { WatermarkType } from '../dataset/enum/Watermark'

/** watermark契约，用于约束公开 API中传递的数据结构。 */
export interface IWatermark {
  /** 业务数据载荷，供当前操作读取或提交。 */
  data: string
  type?: WatermarkType
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width?: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height?: number
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 不透明度，用于控制元素绘制透明程度。 */
  opacity?: number
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size?: number
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font?: string
  /** 是否重复，用于控制背景、页眉页脚或水印复用。 */
  repeat?: boolean
  numberType?: NumberType
  /** 间距值，用于控制元素之间的空白距离。 */
  gap?: [horizontal: number, vertical: number]
}
