import { VerticalAlign } from '../../dataset/enum/VerticalAlign'
import { TdBorder, TdSlash } from '../../dataset/enum/table/Table'
import { IElement, IElementPosition } from '../Element'
import { IRow } from '../Row'

export interface ITd {
  conceptId?: string
  id?: string
  extension?: unknown
  externalId?: string
  /** 分页前原始单元格 id。 */
  pagingOriginId?: string
  x?: number
  y?: number
  width?: number
  height?: number
  colspan: number
  rowspan: number
  value: IElement[]
  trIndex?: number
  tdIndex?: number
  isLastRowTd?: boolean
  isLastColTd?: boolean
  isLastTd?: boolean
  rowIndex?: number
  colIndex?: number
  rowList?: IRow[]
  positionList?: IElementPosition[]
  verticalAlign?: VerticalAlign
  backgroundColor?: string
  borderTypes?: TdBorder[]
  slashTypes?: TdSlash[]
  /** 内容高度加内边距后的主高度。 */
  mainHeight?: number
  /** 单元格实际高度，包含跨行后的累计高度。 */
  realHeight?: number
  /** 单元格允许压缩到的最小真实高度。 */
  realMinHeight?: number
  /** 单元格内容是否不可编辑。 */
  disabled?: boolean
  /** 单元格内容是否不可删除。 */
  deletable?: boolean
}
