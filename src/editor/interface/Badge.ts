/** badge契约，用于约束公开 API中传递的数据结构。 */
export interface IBadge {
  /** 上侧偏移或边距，用于计算区域边界。 */
  top?: number
  /** 左侧偏移或边距，用于计算区域边界。 */
  left?: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string
}

/** badge选项，用于约束调用方可传入的可选配置。 */
export interface IBadgeOption {
  /** 上侧偏移或边距，用于计算区域边界。 */
  top?: number
  /** 左侧偏移或边距，用于计算区域边界。 */
  left?: number
}

/** 区域badge契约，用于约束公开 API中传递的数据结构。 */
export interface IAreaBadge {
  /** 区域标识，用于关联控件或元素所在的编辑区域。 */
  areaId: string
  /** 角标配置，用于在控件或菜单项上展示附加状态。 */
  badge: IBadge
}
