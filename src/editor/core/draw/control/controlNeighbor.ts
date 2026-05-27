import { ControlComponent } from '../../../dataset/enum/Control'
import { INextControlContext } from '../../../interface/Control'
import { IElement } from '../../../interface/Element'
import { IPositionContext } from '../../../interface/Position'
import { forEachTableCellByDirection } from '../../table/utils/TableCellTraversal'

type ControlNeighborDirection = 'pre' | 'next'

interface IResolveControlNeighborInElementListPayload {
  direction: ControlNeighborDirection
  elementList: IElement[]
  startIndex: number
  currentControlId: string
  positionContext: INextControlContext['positionContext']
}

interface IResolveAdjacentControlContextPayload {
  direction: ControlNeighborDirection
  currentControlId: string
  currentElementList: IElement[]
  currentBoundaryIndex: number
  currentPositionContext: IPositionContext
  originalElementList: IElement[]
  tableId?: string
}

function isPreControlEntryComponent(component?: ControlComponent | null) {
  return (
    component === ControlComponent.VALUE ||
    component === ControlComponent.PREFIX ||
    component === ControlComponent.PRE_TEXT
  )
}

function resolvePreControlTailIndex(elementList: IElement[], startIndex: number) {
  let nextIndex = startIndex
  while (nextIndex > 0) {
    const nextElement = elementList[nextIndex]
    if (isPreControlEntryComponent(nextElement.controlComponent)) {
      break
    }
    nextIndex--
  }
  return nextIndex
}

function resolveControlNeighborInElementList(
  payload: IResolveControlNeighborInElementListPayload
): INextControlContext | null {
  const {
    direction,
    elementList,
    startIndex,
    currentControlId,
    positionContext
  } = payload
  if (direction === 'pre') {
    for (let e = startIndex; e > 0; e--) {
      const element = elementList[e]
      if (!element.controlId || element.controlId === currentControlId) {
        continue
      }
      // 向前切换时落到控件尾部第一个有效内容或前缀元素上。
      return {
        positionContext,
        nextIndex: resolvePreControlTailIndex(elementList, e)
      }
    }
    return null
  }
  for (let e = startIndex; e < elementList.length; e++) {
    const element = elementList[e]
    if (!element.controlId || element.controlId === currentControlId) {
      continue
    }
    return {
      positionContext,
      nextIndex: e
    }
  }
  return null
}

function resolveSameCellControlNeighbor(
  payload: IResolveAdjacentControlContextPayload
): INextControlContext | null {
  const context = resolveControlNeighborInElementList({
    direction: payload.direction,
    elementList: payload.currentElementList,
    startIndex: payload.currentBoundaryIndex,
    currentControlId: payload.currentControlId,
    positionContext: {
      isTable: false
    }
  })
  if (!context) return null
  return {
    positionContext: payload.currentPositionContext.isTable
      ? payload.currentPositionContext
      : context.positionContext,
    nextIndex: context.nextIndex
  }
}

/** 按当前表格单元格位置向前或向后查找相邻控件。 */
function resolveTableCellControlNeighbor(
  payload: IResolveAdjacentControlContextPayload
): INextControlContext | null {
  const {
    direction,
    currentControlId,
    currentPositionContext,
    originalElementList,
    tableId
  } = payload
  if (!tableId) return null
  const { index, trIndex, tdIndex } = currentPositionContext
  if (index === undefined || trIndex === undefined || tdIndex === undefined) {
    return null
  }
  const tableElement = originalElementList[index]
  if (!tableElement) return null
  let nextContext: INextControlContext | null = null
  forEachTableCellByDirection({
    tableElement,
    tableIndex: index,
    startTrIndex: trIndex,
    startTdIndex: tdIndex,
    direction,
    isSkipStartCell: true,
    visitor: ({ tr, td, trIndex, tdIndex }) => {
      const context = resolveControlNeighborInElementList({
        direction,
        elementList: td.value,
        startIndex: direction === 'pre' ? td.value.length - 1 : 0,
        currentControlId,
        positionContext: {
          isTable: true,
          index: currentPositionContext.index,
          trIndex,
          tdIndex,
          tdId: td.id,
          trId: tr.id,
          tableId
        }
      })
      if (!context) return
      nextContext = context
      return false
    }
  })
  return nextContext
}

/** 表格内没有相邻控件时，回到外层正文继续按方向查找。 */
function resolveOuterControlNeighbor(
  payload: IResolveAdjacentControlContextPayload
): INextControlContext | null {
  const { direction, currentControlId, currentPositionContext, originalElementList } =
    payload
  const { index } = currentPositionContext
  if (index === undefined) return null
  return resolveControlNeighborInElementList({
    direction,
    elementList: originalElementList,
    startIndex: direction === 'pre' ? index - 1 : index + 1,
    currentControlId,
    positionContext: {
      isTable: false
    }
  })
}

/** 解析当前控件的相邻控件位置，优先同单元格，再表格内，最后外层正文。 */
export function resolveAdjacentControlContext(
  payload: IResolveAdjacentControlContextPayload
): INextControlContext | null {
  const sameCellContext = resolveSameCellControlNeighbor(payload)
  if (sameCellContext) return sameCellContext
  if (!payload.tableId) return null
  return (
    resolveTableCellControlNeighbor(payload) ||
    // 表格内部未命中时，回到外层正文继续寻找相邻控件。
    resolveOuterControlNeighbor(payload)
  )
}
