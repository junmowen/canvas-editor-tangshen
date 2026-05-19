import { ITd } from './Td'

export interface ITr {
  id?: string
  extension?: unknown
  externalId?: string
  /** 分页前原始行 id。 */
  pagingOriginId?: string
  height: number
  tdList: ITd[]
  minHeight?: number
  /** 标记该行是否是分页片段中的重复承接行。 */
  pagingRepeat?: boolean
  /** 标记该行在表格跨页时是否作为页首重复表头。 */
  repeatOnPageStart?: boolean
  /** 分页前原始行高。 */
  pagingOriginHeight?: number
}
