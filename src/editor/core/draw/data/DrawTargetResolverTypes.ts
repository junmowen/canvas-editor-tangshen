import { IElement } from '../../../interface/Element'
import { IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import { ITd } from '../../../interface/table/Td'
import { ITr } from '../../../interface/table/Tr'

export interface IDrawResolvedTableContext {
  positionContext: IPositionContext
  index: number
  element: IElement
  trIndex?: number
  tdIndex?: number
  tableId?: string
}

export interface IDrawResolvedTableCell {
  tableIndex: number
  trIndex: number
  tdIndex: number
}

export interface IDrawResolvedTableTarget {
  element: IElement
  trIndex: number | null
  tdIndex: number | null
}

export interface IDrawResolvedTableTd extends IDrawResolvedTableCell {
  table: IElement
  tr: ITr
  td: ITd
}

export interface IDrawResolvedPreviousPagingTable {
  currentIndex: number
  currentElement: IElement
  previousIndex: number
  previousElement: IElement
}

export interface IDrawResolvedRangeBoundaryElements {
  range: IRange
  elementList: IElement[]
  startElement: IElement | null
  endElement: IElement | null
}

export interface IDrawResolvedRangeContextBoundaryElements {
  startSourceElement: IElement
  endSourceElement: IElement
}

export interface IDrawResolvedControlBoundaryElements {
  range: IRange
  elementList: IElement[]
  controlId: string
  startIndex: number
  endIndex: number
  startElement: IElement | null
  endElement: IElement | null
}
