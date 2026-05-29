/** placeholder契约，用于约束公开 API中传递的数据结构。 */
export interface IPlaceholder {
  /** 业务数据载荷，供当前操作读取或提交。 */
  data: string
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 不透明度，用于控制元素绘制透明程度。 */
  opacity?: number
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size?: number
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font?: string
}
