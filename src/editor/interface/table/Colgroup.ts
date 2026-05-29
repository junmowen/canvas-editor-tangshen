 /** colgroup契约，用于约束公开 API中传递的数据结构。 */
 export interface IColgroup {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
}
