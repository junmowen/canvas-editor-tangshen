import { IPositionContext } from '../../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'

export function resolveVerticalFragmentTransition(payload: {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
  /** 光标页面no，用于定位对应页、行或序号。 */
  cursorPageNo: number
  /** 下一个位置页面no，用于定位对应页、行或序号。 */
  nextPositionPageNo?: number
  /** 是否Shiftkey，用于控制当前流程的判断分支。 */
  isShiftKey: boolean
  /** 逻辑单元格解析函数，用于从命中上下文还原原始单元格。 */
  resolveLogicalCellFromContext: (positionContext: IPositionContext) => {
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 表格行索引，用于定位当前表格内的目标行。 */
    trIndex: number
    /** 单元格索引，用于定位当前行内的目标单元格。 */
    tdIndex: number
  } | null
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
}): number | null {
  const {
    positionContext,
    cursorIndex,
    cursorPageNo,
    nextPositionPageNo,
    isShiftKey,
    resolveLogicalCellFromContext,
    getLogicalCellSliceList,
    resolveFragmentTransitionIndex
  } = payload

  if (
    isShiftKey ||
    !positionContext.isTable ||
    nextPositionPageNo === undefined ||
    nextPositionPageNo <= cursorPageNo
  ) {
    return null
  }

  const logicalCell = resolveLogicalCellFromContext(positionContext)
  if (logicalCell) {
    const sliceList = getLogicalCellSliceList(
      logicalCell.tableIndex,
      logicalCell.trIndex,
      logicalCell.tdIndex
    )
    const currentSliceIndex = sliceList.findIndex(
      slice => slice.pageNo === cursorPageNo
    )
    if (currentSliceIndex >= 0) {
      const nextSlice = sliceList[currentSliceIndex + 1]
      if (nextSlice && nextSlice.pageNo >= nextPositionPageNo) {
        return nextSlice.absoluteStart
      }
    }
  }

  return resolveFragmentTransitionIndex({
    positionContext,
    cursorIndex,
    direction: 'next'
  })
}
