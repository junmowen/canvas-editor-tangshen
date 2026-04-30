import { TableBorder } from '../../dataset/enum/table/Table'
import { IColgroup } from './Colgroup'
import { ITd } from './Td'
import { ITr } from './Tr'

export interface ITableFragmentCell extends ITd {
  originId?: string
  cellOriginTrId?: string
  absoluteStart?: number
  absoluteEnd?: number
}

export interface ITableFragmentRow
  extends Omit<ITr, 'tdList'> {
  tdList: ITableFragmentCell[]
  repeatOnPageStart?: boolean
  originHeight?: number
  originId?: string
}

export interface ITableFragmentDescriptor {
  tableId: string
  logicalTableId: string
  logicalTableIndex: number
  fragmentOrder: number
  colgroup?: IColgroup[]
  trList?: ITableFragmentRow[]
  borderType?: TableBorder
  borderColor?: string
  borderWidth?: number
  borderExternalWidth?: number
  width: number
  height: number
}
