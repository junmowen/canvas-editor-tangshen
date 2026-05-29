import { VerticalAlign } from '../dataset/enum/VerticalAlign'

/** 复选框契约，用于约束公开 API中传递的数据结构。 */
export interface ICheckbox {
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: boolean | null
  /** 业务编码，用于识别控件、命令或错误类型。 */
  code?: string
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
}

/** 复选框选项，用于约束调用方可传入的可选配置。 */
export interface ICheckboxOption {
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width?: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height?: number
  /** 间距值，用于控制元素之间的空白距离。 */
  gap?: number
  /** 线宽，用于设置 Canvas 描边粗细。 */
  lineWidth?: number
  /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
  fillStyle?: string
  /** 描边样式，用于设置 Canvas 线条颜色或图案。 */
  strokeStyle?: string
  /** 垂直对齐方式，用于控制元素在行内或单元格内的位置。 */
  verticalAlign?: VerticalAlign
}
