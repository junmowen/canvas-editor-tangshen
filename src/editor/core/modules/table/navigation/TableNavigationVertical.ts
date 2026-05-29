import { IPositionContext } from '../../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'
import {
  ITableVerticalNavigationRequest,
  ITableVerticalNavigationResult
} from './TableNavigationTypes'
import {
  createTablePositionContext,
  resolvePreviousPageIndexWithinCurrentCell,
  resolveVerticalIndexWithinCurrentCell,
  resolveVerticalSiblingCell,
  resolveVerticalTargetSlice
} from './TableNavigationAlgorithms'

/** verticalnavigationdeps契约，用于约束内部流程中传递的数据结构。 */
interface IVerticalNavigationDeps {
  /** getoriginal元素，用于定位或修改对应文档节点。 */
  getOriginalElement: (index: number) => any
  getPositionList: () => any[]
  /** get光标位置，用于描述布局或命中的空间范围。 */
  getCursorPosition: () => any
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
  /** resolve片段transition索引，用于定位对应元素、行或片段。 */
  resolveFragmentTransitionIndex: (
    payload: { positionContext: IPositionContext; cursorIndex: number; direction: 'prev' | 'next' }
  ) => number | null
}

export function resolveVerticalNavigation(
  deps: IVerticalNavigationDeps,
  payload: ITableVerticalNavigationRequest
): ITableVerticalNavigationResult | null {
  const { positionContext, cursorIndex, direction } = payload
  const logicalCell = deps.resolveLogicalCellFromContext(positionContext)
  if (!logicalCell) {
    return null
  }

  const table = deps.getOriginalElement(logicalCell.tableIndex)
  if (!table?.trList?.length) {
    return null
  }
  const logicalCellSliceList = deps.getLogicalCellSliceList(
    logicalCell.tableIndex,
    logicalCell.trIndex,
    logicalCell.tdIndex
  )
  const resolvePositionContextByIndex = (index: number): IPositionContext | null => {
    const slice = logicalCellSliceList.find(
      slice => index >= slice.absoluteStart && index < slice.absoluteEnd
    )
    return slice ? createTablePositionContext({ slice }) : null
  }
  const currentPosition = deps.getPositionList()[cursorIndex]
  const visibleCursorPosition = deps.getCursorPosition()
  const referencePageNo = visibleCursorPosition?.pageNo ?? currentPosition?.pageNo
  if (
    direction === 'up' &&
    (visibleCursorPosition?.isFirstLetter || currentPosition?.isFirstLetter)
  ) {
    const previousPageIndex = resolvePreviousPageIndexWithinCurrentCell({
      positionList: deps.getPositionList(),
      cursorIndex
    })
    if (previousPageIndex !== null) {
      return {
        nextPositionContext: null,
        nextIndex: previousPageIndex
      }
    }
    const previousFragmentIndex = deps.resolveFragmentTransitionIndex({
      positionContext,
      cursorIndex,
      direction: 'prev'
    })
    if (previousFragmentIndex !== null) {
      return {
        nextPositionContext: resolvePositionContextByIndex(previousFragmentIndex),
        nextIndex: previousFragmentIndex
      }
    }
  }

  const sameCellVerticalIndex = resolveVerticalIndexWithinCurrentCell({
    positionList: deps.getPositionList(),
    cursorIndex,
    direction,
    currentPosition: visibleCursorPosition
  })
  if (sameCellVerticalIndex !== null) {
    return {
      nextPositionContext: null,
      nextIndex: sameCellVerticalIndex
    }
  }

  if (direction === 'up') {
    if (logicalCell.trIndex === 0) {
      const previousFragmentIndex = deps.resolveFragmentTransitionIndex({
        positionContext,
        cursorIndex,
        direction: 'prev'
      })
      if (previousFragmentIndex !== null) {
        return {
          nextPositionContext: null,
          nextIndex: previousFragmentIndex
        }
      }
      return {
        nextPositionContext: { isTable: false },
        nextIndex: logicalCell.tableIndex - 1,
        disposeTableTool: true
      }
    }

    const targetCell = resolveVerticalSiblingCell({
      trList: table.trList,
      trIndex: logicalCell.trIndex,
      tdIndex: logicalCell.tdIndex,
      direction: 'up'
    })
    if (!targetCell) {
      return null
    }

    const targetTr = table.trList[targetCell.trIndex]
    const targetTd = targetTr?.tdList?.[targetCell.tdIndex]
    if (!targetTr || !targetTd) {
      return null
    }
    const targetSlice = resolveVerticalTargetSlice({
      sliceList: deps.getLogicalCellSliceList(
        logicalCell.tableIndex,
        targetCell.trIndex,
        targetCell.tdIndex
      ),
      referencePageNo,
      direction: 'up'
    })

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

  const lastTrIndex = table.trList.length - 1
  if (logicalCell.trIndex === lastTrIndex) {
    const nextFragmentIndex = deps.resolveFragmentTransitionIndex({
      positionContext,
      cursorIndex,
      direction: 'next'
    })
    if (nextFragmentIndex !== null) {
      return {
        nextPositionContext: null,
        nextIndex: nextFragmentIndex
      }
    }
    return {
      nextPositionContext: { isTable: false },
      nextIndex: logicalCell.tableIndex,
      disposeTableTool: true
    }
  }

  const targetCell = resolveVerticalSiblingCell({
    trList: table.trList,
    trIndex: logicalCell.trIndex,
    tdIndex: logicalCell.tdIndex,
    direction: 'down'
  })
  if (!targetCell) {
    return null
  }

  const targetTr = table.trList[targetCell.trIndex]
  const targetTd = targetTr?.tdList?.[targetCell.tdIndex]
  if (!targetTr || !targetTd) {
    return null
  }
  const targetSlice = resolveVerticalTargetSlice({
    sliceList: deps.getLogicalCellSliceList(
      logicalCell.tableIndex,
      targetCell.trIndex,
      targetCell.tdIndex
    ),
    referencePageNo,
    direction: 'down'
  })

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
