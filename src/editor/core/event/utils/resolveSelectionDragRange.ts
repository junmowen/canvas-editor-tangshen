import { ControlComponent } from '../../../dataset/enum/Control'
import { ICurrentPosition, IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import { Draw } from '../../draw/Draw'
import { ITableLayoutCellSlice } from '../../table/layout/TableLayoutSnapshotTypes'
import { createTablePositionContext } from '../../table/navigation/TableNavigationAlgorithms'
import { resolvePositionAtIndex } from './resolvePositionAtIndex'

export interface IResolvedSelectionDragRange {
  range: IRange
  positionContext?: IPositionContext
  hasSelectionDrag: boolean
}

interface IResolveSelectionDragRangePayload {
  draw: Draw
  startPosition: ICurrentPosition
  positionResult: ICurrentPosition
  pointerX?: number
  pointerY?: number
  endBoundaryIndex: number
  endHitTargetIndex?: number
}

interface IBaseTextHit {
  boundaryIndex: number
  hitIndex?: number
  isRightBoundaryHit?: boolean
}

interface ITextHit extends IBaseTextHit {
  object: 'text'
}

interface ITableTextHit extends IBaseTextHit {
  object: 'table-text'
  tableId?: string
  trId?: string
  tdId?: string
  trIndex?: number
  tdIndex?: number
  slice?: ITableLayoutCellSlice | null
}

type TPointerHit = ITextHit | ITableTextHit

function isTableTextHit(hit: TPointerHit): hit is ITableTextHit {
  return hit.object === 'table-text'
}

function normalizeRange(startIndex: number, endIndex: number): IRange | null {
  if (startIndex === endIndex) return null
  return startIndex < endIndex
    ? { startIndex, endIndex }
    : { startIndex: endIndex, endIndex: startIndex }
}

function getTableSlice(draw: Draw, position: ICurrentPosition) {
  if (!position.tableId || !position.trId || !position.tdId) return null
  return draw.getTargetResolver().resolveTableSliceByFragmentContext({
    tableId: position.tableId,
    trId: position.trId,
    tdId: position.tdId,
    trIndex: position.trIndex,
    tdIndex: position.tdIndex
  })
}

function toPointerHit(payload: {
  draw: Draw
  position: ICurrentPosition
  boundaryIndex: number
  hitIndex?: number
}): TPointerHit {
  const { draw, position, boundaryIndex, hitIndex } = payload
  const resolveIsRightBoundaryHit = () => {
    if (position.forceNotRightBoundaryHit) return false
    if (hitIndex === undefined || position.x === undefined) return false
    if (position.isTable) {
      const slice = getTableSlice(draw, position)
      if (!slice) return false
      const hitPosition = slice.positionList[hitIndex - slice.absoluteStart]
      const rightX = hitPosition?.coordinate.rightTop[0]
      return rightX !== undefined ? position.x >= rightX - 1 : false
    }
    const hitPosition = resolvePositionAtIndex(draw, hitIndex)
    const rightX = hitPosition?.coordinate.rightTop[0]
    return rightX !== undefined ? position.x >= rightX - 1 : false
  }
  if (!position.isTable) {
    return {
      object: 'text',
      boundaryIndex,
      hitIndex,
      isRightBoundaryHit: resolveIsRightBoundaryHit()
    }
  }
  return {
    object: 'table-text',
    boundaryIndex,
    hitIndex,
    tableId: position.tableId,
    trId: position.trId,
    tdId: position.tdId,
    trIndex: position.trIndex,
    tdIndex: position.tdIndex,
    slice: getTableSlice(draw, position),
    isRightBoundaryHit: resolveIsRightBoundaryHit()
  }
}

function getLogicalTableCell(hit: ITableTextHit) {
  return {
    tableIndex: hit.slice?.logicalTableIndex,
    trIndex: hit.slice?.logicalTrIndex ?? hit.trIndex,
    tdIndex: hit.slice?.logicalTdIndex ?? hit.tdIndex,
    tableId: hit.slice?.logicalTableId ?? hit.tableId
  }
}

function isSameTextObject(startHit: TPointerHit, endHit: TPointerHit): boolean {
  if (startHit.object !== endHit.object) return false
  if (startHit.object === 'text' && endHit.object === 'text') return true
  if (!isTableTextHit(startHit) || !isTableTextHit(endHit)) return false
  const startCell = getLogicalTableCell(startHit)
  const endCell = getLogicalTableCell(endHit)
  return !!(
    startCell.tableId &&
    endCell.tableId &&
    startCell.tableId === endCell.tableId &&
    startCell.trIndex === endCell.trIndex &&
    startCell.tdIndex === endCell.tdIndex
  )
}

function isSameTableFragment(startHit: ITableTextHit, endHit: ITableTextHit): boolean {
  return !!(
    startHit.tableId &&
    startHit.tableId === endHit.tableId &&
    startHit.trId === endHit.trId &&
    startHit.tdId === endHit.tdId
  )
}

function shouldUseHitTextRange(startHit: TPointerHit, endHit: TPointerHit): boolean {
  if (startHit.object === 'text' && endHit.object === 'text') return true
  if (isTableTextHit(startHit) && isTableTextHit(endHit)) {
    return isSameTableFragment(startHit, endHit)
  }
  return false
}

function shouldSelectSingleTableCell(payload: {
  startHit: ITableTextHit
  endHit: ITableTextHit
  startPosition: ICurrentPosition
  pointerX?: number
  pointerY?: number
}) {
  const { startHit, endHit, startPosition, pointerX, pointerY } = payload
  if (!isSameTextObject(startHit, endHit)) return false
  if (
    startPosition.x === undefined ||
    startPosition.y === undefined ||
    pointerX === undefined ||
    pointerY === undefined
  ) {
    return false
  }
  const deltaX = Math.abs(pointerX - startPosition.x)
  const deltaY = Math.abs(pointerY - startPosition.y)
  return deltaX >= 4 || deltaY >= 4
}

function resolveHitRangeStartBoundary(hit: TPointerHit): number {
  if (hit.hitIndex !== undefined) {
    if (hit.isRightBoundaryHit) {
      return hit.boundaryIndex
    }
    return hit.hitIndex - 1
  }
  return hit.boundaryIndex
}

function resolveHitRangeEndBoundary(hit: TPointerHit): number {
  if (hit.hitIndex !== undefined) {
    return Math.max(hit.boundaryIndex, hit.hitIndex)
  }
  return hit.boundaryIndex
}

function resolveTextSelection(payload: {
  startHit: TPointerHit
  endHit: TPointerHit
  useHitRange: boolean
}): IRange | null {
  const { startHit, endHit, useHitRange } = payload
  if (
    useHitRange &&
    startHit.hitIndex !== undefined &&
    endHit.hitIndex !== undefined
  ) {
    if (startHit.isRightBoundaryHit) {
      return normalizeRange(
        startHit.boundaryIndex,
        startHit.boundaryIndex > endHit.boundaryIndex
          ? endHit.boundaryIndex
          : resolveHitRangeEndBoundary(endHit)
      )
    }
    return normalizeRange(
      Math.min(
        resolveHitRangeStartBoundary(startHit),
        resolveHitRangeStartBoundary(endHit)
      ),
      Math.max(
        resolveHitRangeEndBoundary(startHit),
        resolveHitRangeEndBoundary(endHit)
      )
    )
  }
  return normalizeRange(startHit.boundaryIndex, endHit.boundaryIndex)
}

function createTableContext(hit: ITableTextHit): IPositionContext {
  return createTablePositionContext({
    slice: hit.slice,
    logicalTableIndex: hit.slice?.logicalTableIndex,
    logicalTrIndex: hit.slice?.logicalTrIndex ?? hit.trIndex,
    logicalTdIndex: hit.slice?.logicalTdIndex ?? hit.tdIndex,
    fragmentTableId: hit.tableId,
    fragmentTrId: hit.trId,
    fragmentTdId: hit.tdId
  })
}

function resolveTableCellSelection(payload: {
  startHit: ITableTextHit
  endHit: ITableTextHit
}): IResolvedSelectionDragRange | null {
  const { startHit, endHit } = payload
  const startCell = getLogicalTableCell(startHit)
  const endCell = getLogicalTableCell(endHit)
  if (
    startCell.tableId === undefined ||
    startCell.trIndex === undefined ||
    startCell.tdIndex === undefined ||
    endCell.trIndex === undefined ||
    endCell.tdIndex === undefined
  ) {
    return null
  }
  return {
    range: {
      startIndex: endHit.boundaryIndex,
      endIndex: endHit.boundaryIndex,
      tableId: startCell.tableId,
      startTdIndex: startCell.tdIndex,
      endTdIndex: endCell.tdIndex,
      startTrIndex: startCell.trIndex,
      endTrIndex: endCell.trIndex
    },
    positionContext: createTableContext(endHit),
    hasSelectionDrag: false
  }
}

function isPlaceholderRange(draw: Draw, range: IRange): boolean {
  const elementList = draw.getObjectResolver().getElementList()
  const startElement = elementList[range.startIndex + 1]
  const endElement = elementList[range.endIndex]
  return !!(
    startElement?.controlComponent === ControlComponent.PLACEHOLDER &&
    endElement?.controlComponent === ControlComponent.PLACEHOLDER &&
    startElement.controlId === endElement.controlId
  )
}

export function resolveSelectionDragRange(
  payload: IResolveSelectionDragRangePayload
): IResolvedSelectionDragRange | null {
  const {
    draw,
    startPosition,
    positionResult,
    pointerX,
    pointerY,
    endBoundaryIndex,
    endHitTargetIndex
  } = payload

  const startHit = toPointerHit({
    draw,
    position: startPosition,
    boundaryIndex: startPosition.index,
    hitIndex: startPosition.hitTargetIndex
  })
  const endHit = toPointerHit({
    draw,
    position: positionResult,
    boundaryIndex: endBoundaryIndex,
    hitIndex: endHitTargetIndex
  })
  if (isSameTextObject(startHit, endHit)) {
    const range = resolveTextSelection({
      startHit,
      endHit,
      useHitRange: shouldUseHitTextRange(startHit, endHit)
    })
    if (range) {
      if (startHit.object === 'text' && isPlaceholderRange(draw, range)) {
        return null
      }
      return {
        range,
        positionContext:
          endHit.object === 'table-text'
            ? createTableContext(endHit)
            : undefined,
        hasSelectionDrag: true
      }
    }
    if (
      isTableTextHit(startHit) &&
      isTableTextHit(endHit) &&
      shouldSelectSingleTableCell({
        startHit,
        endHit,
        startPosition,
        pointerX,
        pointerY
      })
    ) {
      return resolveTableCellSelection({ startHit, endHit })
    }
    return null
  }

  if (startHit.object === 'table-text' && endHit.object === 'table-text') {
    return resolveTableCellSelection({ startHit, endHit })
  }

  return null
}
