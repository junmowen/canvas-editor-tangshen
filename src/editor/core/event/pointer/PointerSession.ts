import { IElement, IElementPosition } from '../../../interface/Element'
import { ICurrentPosition, IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import { IPointerCoordinatePayload } from './coordinates/PointerCoordinateTypes'

export interface ITableCellClickInfo {
  tableId?: string
  trIndex?: number
  tdIndex?: number
  tdId?: string
  trId?: string
  tdValueIndex?: number
  pageNo?: number
  logicalTableId?: string
  logicalTrIndex?: number
  logicalTdIndex?: number
  logicalTrId?: string
  logicalTdId?: string
  cellKey?: string
}

export interface IPointerDragSnapshot {
  range: IRange | null
  elementList: IElement[] | null
  positionList: IElementPosition[] | null
  positionContext: IPositionContext | null
}

export interface IPointerMultiClickState {
  lastTableCellDblclickInfo: ITableCellClickInfo | null
  tableCellDblclickCount: number
  tableCellClickResetTimer: number | null
}

export interface IPointerSession {
  isAllowSelection: boolean
  isAllowDrag: boolean
  isAllowDrop: boolean
  dragSnapshot: IPointerDragSnapshot
  mouseDownStartPosition: ICurrentPosition | null
  mouseDownStartCoordinates: IPointerCoordinatePayload | null
  lastPointerCoordinates: IPointerCoordinatePayload | null
  multiClick: IPointerMultiClickState
}

export function createDefaultPointerSession(): IPointerSession {
  return {
    isAllowSelection: false,
    isAllowDrag: false,
    isAllowDrop: false,
    dragSnapshot: {
      range: null,
      elementList: null,
      positionList: null,
      positionContext: null
    },
    mouseDownStartPosition: null,
    mouseDownStartCoordinates: null,
    lastPointerCoordinates: null,
    multiClick: {
      lastTableCellDblclickInfo: null,
      tableCellDblclickCount: 0,
      tableCellClickResetTimer: null
    }
  }
}
