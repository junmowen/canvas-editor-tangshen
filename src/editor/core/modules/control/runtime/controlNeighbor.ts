import { ControlComponent } from '../../../../dataset/enum/Control'
import { INextControlContext } from '../../../../interface/Control'
import { IElement } from '../../../../interface/Element'
import { IPositionContext } from '../../../../interface/Position'
import { forEachTableCellByDirection } from '../../table/utils/TableCellTraversal'

/** 控件neighbordirection，限定移动、遍历或绘制时允许的方向取值。 */
type ControlNeighborDirection = 'pre' | 'next'

/** resolve控件neighborin元素列表调用载荷，聚合执行该操作所需的输入数据。 */
interface IResolveControlNeighborInElementListPayload {
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: ControlNeighborDirection
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 当前控件标识，用于限定邻近控件查找范围。 */
  currentControlId: string
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: INextControlContext['positionContext']
}

/** resolveadjacent控件上下文调用载荷，聚合执行该操作所需的输入数据。 */
interface IResolveAdjacentControlContextPayload {
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: ControlNeighborDirection
  /** 当前控件标识，用于限定邻近控件查找范围。 */
  currentControlId: string
  /** 当前控件元素列表，保存正在处理的局部元素序列。 */
  currentElementList: IElement[]
  /** 当前边界索引，用于在控件范围内定位临界点。 */
  currentBoundaryIndex: number
  /** 当前位置上下文，保存当前控件范围内的命中信息。 */
  currentPositionContext: IPositionContext
  /** 原始文档元素列表，用于和当前局部元素范围对照。 */
  originalElementList: IElement[]
  /** 表格标识，用于关联表格片段、行和单元格。 */
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
