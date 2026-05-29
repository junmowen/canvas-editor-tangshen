import { TitleLevel } from '../dataset/enum/Title'

/** 目录item契约，用于约束公开 API中传递的数据结构。 */
export interface ICatalogItem {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id: string
  /** 显示名称或注册名称，用于界面展示和模块查找。 */
  name: string
  /** 层级值，用于描述标题、列表或嵌套结构深度。 */
  level: TitleLevel
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 子目录列表，用于表达目录层级结构。 */
  subCatalog: ICatalogItem[]
}

/** 目录类型，用于约束公开 API中传递的数据结构。 */
export type ICatalog = ICatalogItem[]
