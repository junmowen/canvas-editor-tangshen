/** 页面break契约，用于约束公开 API中传递的数据结构。 */
export interface IPageBreak {
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font?: string
  /** 字体大小，单位为编辑器内部像素。 */
  fontSize?: number
  /** 行dash数值，用于当前布局、统计或索引计算。 */
  lineDash?: number[]
}
