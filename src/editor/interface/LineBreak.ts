/** 行break选项，用于约束调用方可传入的可选配置。 */
export interface ILineBreakOption {
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 线宽，用于设置 Canvas 描边粗细。 */
  lineWidth?: number
}
