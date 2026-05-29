/** 分组契约，用于约束公开 API中传递的数据结构。 */
export interface IGroup {
  /** 不透明度，用于控制元素绘制透明程度。 */
  opacity?: number
  /** 背景颜色，用于填充元素或区域底色。 */
  backgroundColor?: string
  /** 激活态不透明度，用于突出当前选中的控件或分组。 */
  activeOpacity?: number
  /** 激活态背景颜色，用于突出当前选中的控件或分组。 */
  activeBackgroundColor?: string
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
  /** 是否允许删除，用于控制控件或元素的删除权限。 */
  deletable?: boolean
}
