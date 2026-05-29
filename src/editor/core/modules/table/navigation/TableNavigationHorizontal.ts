import { ElementType } from '../../../../dataset/enum/Element'
import { IPositionContext } from '../../../../interface/Position'
import { ITableAdjacentCellNavigationResult, ITableHorizontalBoundaryNavigationRequest } from './TableNavigationTypes'
import {
  createTablePositionContext,
  resolveHorizontalSiblingCell
} from './TableNavigationAlgorithms'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'

/** horizontalnavigationdeps契约，用于约束内部流程中传递的数据结构。 */
interface IHorizontalNavigationDeps {
  /** getoriginal元素，用于定位或修改对应文档节点。 */
  getOriginalElement: (index: number) => any
  /** get元素，用于定位或修改对应文档节点。 */
  getElement: (index: number) => any
  /** 逻辑单元格解析函数，用于从命中上下文还原原始单元格。 */
  resolveLogicalCellFromContext: (positionContext: IPositionContext) => {
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 表格行索引，用于定位当前表格内的目标行。 */
    trIndex: number
    /** 单元格索引，用于定位当前行内的目标单元格。 */
    tdIndex: number
  } | null
  /** 位置片段解析函数，用于从命中上下文获取表格切片。 */
  resolveSliceByPositionContext: (positionContext: IPositionContext) => ITableLayoutCellSlice | null
  /** 逻辑单元格切片读取函数，用于获取跨分页后的单元格片段。 */
  getLogicalCellSliceList: (
    tableIndex: number,
    trIndex: number,
    tdIndex: number
  ) => ITableLayoutCellSlice[]
}

export function resolveHorizontalBoundaryNavigation(
  deps: IHorizontalNavigationDeps,
  payload: ITableHorizontalBoundaryNavigationRequest
): ITableAdjacentCellNavigationResult | null {
  const { positionContext, range, direction } = payload
  const { startIndex, endIndex } = range

  if (direction === 'prev') {
    const currentElement = deps.getElement(startIndex)
    if (
      currentElement?.type !== ElementType.TABLE &&
      (!currentElement?.tableId || startIndex !== 0)
    ) {
      return null
    }
  } else {
    const currentElement = deps.getElement(endIndex)
    const nextElement = deps.getElement(endIndex + 1)
    if (
      nextElement?.type !== ElementType.TABLE &&
      (!currentElement?.tableId || !!nextElement)
    ) {
      return null
    }
  }

  if (direction === 'prev') {
    const currentElement = deps.getElement(startIndex)
    if (currentElement?.type === ElementType.TABLE) {
      const table = deps.getOriginalElement(startIndex)
      if (!table?.trList?.length) {
        return null
      }
      const trIndex = table.trList.length - 1
      const tdIndex = table.trList[trIndex].tdList.length - 1
      const tr = table.trList[trIndex]
      const td = tr?.tdList?.[tdIndex]
      if (!tr || !td) {
        return null
      }
      const sliceList = deps.getLogicalCellSliceList(startIndex, trIndex, tdIndex)
      const targetSlice = sliceList[sliceList.length - 1] || null
      return {
        nextPositionContext: createTablePositionContext({
          slice: targetSlice,
          logicalTableIndex: startIndex,
          logicalTrIndex: trIndex,
          logicalTdIndex: tdIndex,
          fragmentTableId: table.id,
          fragmentTrId: tr.id,
          fragmentTdId: td.id
        }),
        nextIndex: Math.max(0, (targetSlice?.absoluteEnd ?? td.value.length) - 1)
      }
    }

    if (!currentElement?.tableId || startIndex !== 0) {
      return null
    }

    const logicalCell = deps.resolveLogicalCellFromContext(positionContext)
    if (!logicalCell) {
      return null
    }

    const table = deps.getOriginalElement(logicalCell.tableIndex)
    if (!table?.trList?.length) {
      return null
    }

    if (logicalCell.trIndex === 0 && logicalCell.tdIndex === 0) {
      return {
        nextPositionContext: { isTable: false },
        nextIndex: logicalCell.tableIndex - 1,
        disposeTableTool: true
      }
    }

    const targetCell = resolveHorizontalSiblingCell({
      trList: table.trList,
      trIndex: logicalCell.trIndex,
      tdIndex: logicalCell.tdIndex,
      direction: 'prev'
    })
    if (!targetCell) {
      return null
    }

    const targetTr = table.trList[targetCell.trIndex]
    const targetTd = targetTr?.tdList?.[targetCell.tdIndex]
    if (!targetTr || !targetTd) {
      return null
    }
    const sliceList = deps.getLogicalCellSliceList(
      logicalCell.tableIndex,
      targetCell.trIndex,
      targetCell.tdIndex
    )
    const targetSlice = sliceList[sliceList.length - 1] || null
    return {
      nextPositionContext: createTablePositionContext({
        slice: targetSlice,
        logicalTableIndex: logicalCell.tableIndex,
        logicalTrIndex: targetCell.trIndex,
        logicalTdIndex: targetCell.tdIndex,
        fragmentTableId: table.id,
        fragmentTrId: targetTr.id,
        fragmentTdId: targetTd.id
      }),
      nextIndex: Math.max(0, (targetSlice?.absoluteEnd ?? targetTd.value.length) - 1)
    }
  }

  const currentElement = deps.getElement(endIndex)
  const nextElement = deps.getElement(endIndex + 1)
  if (nextElement?.type === ElementType.TABLE) {
    const table = deps.getOriginalElement(endIndex + 1)
    if (!table?.trList?.length) {
      return null
    }
    const tr = table.trList[0]
    const td = tr?.tdList?.[0]
    if (!tr || !td) {
      return null
    }
    const sliceList = deps.getLogicalCellSliceList(endIndex + 1, 0, 0)
    const targetSlice = sliceList[0] || null
    return {
      nextPositionContext: createTablePositionContext({
        slice: targetSlice,
        logicalTableIndex: endIndex + 1,
        logicalTrIndex: 0,
        logicalTdIndex: 0,
        fragmentTableId: table.id,
        fragmentTrId: tr.id,
        fragmentTdId: td.id
      }),
      nextIndex: targetSlice?.absoluteStart ?? 0
    }
  }

  if (!currentElement?.tableId || nextElement) {
    return null
  }

  const logicalCell = deps.resolveLogicalCellFromContext(positionContext)
  if (!logicalCell) {
    return null
  }
  const activeSlice = deps.resolveSliceByPositionContext(positionContext)
  const activeSliceStartIndex =
    activeSlice?.positionList[0]?.index ?? activeSlice?.absoluteStart
  if (
    activeSlice &&
    activeSliceStartIndex !== undefined &&
    endIndex >= activeSliceStartIndex &&
    endIndex + 1 < activeSlice.absoluteEnd
  ) {
    const nextIndex =
      endIndex < activeSlice.absoluteStart
        ? activeSlice.absoluteStart + endIndex + 1
        : endIndex + 1
    return {
      nextPositionContext: createTablePositionContext({
        slice: activeSlice
      }),
      nextIndex
    }
  }
  const table = deps.getOriginalElement(logicalCell.tableIndex)
  if (!table?.trList?.length) {
    return null
  }

  const lastTrIndex = table.trList.length - 1
  const lastTdIndex = table.trList[lastTrIndex].tdList.length - 1
  if (
    logicalCell.trIndex === lastTrIndex &&
    logicalCell.tdIndex === lastTdIndex
  ) {
    return {
      nextPositionContext: { isTable: false },
      nextIndex: logicalCell.tableIndex,
      disposeTableTool: true
    }
  }

  const targetCell = resolveHorizontalSiblingCell({
    trList: table.trList,
    trIndex: logicalCell.trIndex,
    tdIndex: logicalCell.tdIndex,
    direction: 'next'
  })
  if (!targetCell) {
    return null
  }

  const targetTr = table.trList[targetCell.trIndex]
  const targetTd = targetTr?.tdList?.[targetCell.tdIndex]
  if (!targetTr || !targetTd) {
    return null
  }
  const sliceList = deps.getLogicalCellSliceList(
    logicalCell.tableIndex,
    targetCell.trIndex,
    targetCell.tdIndex
  )
  const targetSlice = sliceList[0] || null
  return {
    nextPositionContext: createTablePositionContext({
      slice: targetSlice,
      logicalTableIndex: logicalCell.tableIndex,
      logicalTrIndex: targetCell.trIndex,
      logicalTdIndex: targetCell.tdIndex,
      fragmentTableId: table.id,
      fragmentTrId: targetTr.id,
      fragmentTdId: targetTd.id
    }),
    nextIndex: targetSlice?.absoluteStart ?? 0
  }
}
