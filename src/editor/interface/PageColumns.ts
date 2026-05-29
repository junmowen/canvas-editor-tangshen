/** 页面columns契约，用于约束公开 API中传递的数据结构。 */
export interface IPageColumns {
  /** 当前缓存数量，用于衡量资源池占用。 */
  count?: number
  /** 间距值，用于控制元素之间的空白距离。 */
  gap?: number
  /** widths数值，用于当前布局、统计或索引计算。 */
  widths?: number[]
}
