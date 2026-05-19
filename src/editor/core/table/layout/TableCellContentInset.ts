import { TableBorder, TdBorder } from '../../../dataset/enum/table/Table'
import { IElement } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { ITd } from '../../../interface/table/Td'

export interface ITableCellContentInset {
  top: number
  right: number
  bottom: number
  left: number
}

export function getTableCellContentInset(
  table: IElement | ITableFragmentDescriptor,
  td: ITd
): ITableCellContentInset {
  const borderType = table.borderType || TableBorder.ALL
  const tableBorderWidth = table.borderWidth || 1
  const externalBorderWidth = table.borderExternalWidth || tableBorderWidth
  const cellBorderWidth = td.borderWidth || tableBorderWidth
  const getInsetWidth = (borderWidth: number) => Math.max(0, borderWidth - 1)
  const inset: ITableCellContentInset = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  }

  if (borderType === TableBorder.ALL || borderType === TableBorder.DASH) {
    const width = getInsetWidth(tableBorderWidth)
    inset.top = width
    inset.right = width
    inset.bottom = width
    inset.left = width
  } else if (borderType === TableBorder.EXTERNAL) {
    const width = getInsetWidth(externalBorderWidth)
    if (td.rowIndex === 0) inset.top = width
    if (td.isLastColTd) inset.right = width
    if (td.isLastRowTd) inset.bottom = width
    if (td.colIndex === 0) inset.left = width
  } else if (borderType === TableBorder.INTERNAL) {
    const width = getInsetWidth(tableBorderWidth)
    if (td.rowIndex !== 0) inset.top = width
    if (!td.isLastColTd) inset.right = width
    if (!td.isLastRowTd) inset.bottom = width
    if (td.colIndex !== 0) inset.left = width
  }

  if (td.borderTypes?.includes(TdBorder.TOP)) {
    inset.top = Math.max(inset.top, getInsetWidth(cellBorderWidth))
  }
  if (td.borderTypes?.includes(TdBorder.RIGHT)) {
    inset.right = Math.max(inset.right, getInsetWidth(cellBorderWidth))
  }
  if (td.borderTypes?.includes(TdBorder.BOTTOM)) {
    inset.bottom = Math.max(inset.bottom, getInsetWidth(cellBorderWidth))
  }
  if (td.borderTypes?.includes(TdBorder.LEFT)) {
    inset.left = Math.max(inset.left, getInsetWidth(cellBorderWidth))
  }

  return inset
}
