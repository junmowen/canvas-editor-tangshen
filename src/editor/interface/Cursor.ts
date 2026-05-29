/** 光标选项，用于约束调用方可传入的可选配置。 */
export interface ICursorOption {
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width?: number
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 拖拽指示宽度，用于绘制拖拽光标或占位线。 */
  dragWidth?: number
  /** 拖拽指示颜色，用于绘制拖拽光标或占位线。 */
  dragColor?: string
  /** 是否禁用图片浮动拖拽，用于限制图片交互方式。 */
  dragFloatImageDisabled?: boolean
}
