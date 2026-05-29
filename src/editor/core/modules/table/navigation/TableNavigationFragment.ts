import { IPositionContext } from '../../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'
import { ITableFragmentTransitionRequest } from './TableNavigationTypes'

/** 片段navigationdeps契约，用于约束内部流程中传递的数据结构。 */
interface IFragmentNavigationDeps {
  /** 逻辑单元格解析函数，用于从命中上下文还原原始单元格。 */
  resolveLogicalCellFromContext: (positionContext: IPositionContext) => {
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 表格行索引，用于定位当前表格内的目标行。 */
    trIndex: number
    /** 单元格索引，用于定位当前行内的目标单元格。 */
    tdIndex: number
  } | null
  /** resolve表格tdby索引，用于定位对应元素、行或片段。 */
  resolveTableTdByIndex: (payload: {
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 表格行索引，用于定位当前表格内的目标行。 */
    trIndex: number
    /** 单元格索引，用于定位当前行内的目标单元格。 */
    tdIndex: number
  }) => {
    /** 表格数据对象，保存行、列和单元格结构。 */
    table: { id?: string }
    /** 表格行对象，保存一行内的单元格结构。 */
    tr: { id?: string }
    /** 表格单元格对象，保存单元格内容和样式。 */
    td: { id?: string; rowspan: number; colspan: number }
  } | null
  /** 位置片段解析函数，用于从命中上下文获取表格切片。 */
  resolveSliceByPositionContext: (positionContext: IPositionContext) => ITableLayoutCellSlice | null
  /** get单元格slicesby逻辑单元格，用于保存或定位表格单元格结构。 */
  getCellSlicesByLogicalCell: (payload: {
    /** 表格标识，用于关联表格片段、行和单元格。 */
    tableId: string
    /** 表格行标识，用于关联行位置、片段和选区。 */
    trId: string
    /** 单元格标识，用于关联单元格位置、片段和选区。 */
    tdId: string
  }) => ITableLayoutCellSlice[]
}

export function resolveFragmentTransitionIndex(
  deps: IFragmentNavigationDeps,
  payload: ITableFragmentTransitionRequest
): number | null {
  const { positionContext, cursorIndex, direction } = payload
  const logicalCell = deps.resolveLogicalCellFromContext(positionContext)
  if (!logicalCell) {
    return null
  }

  const tableCell = deps.resolveTableTdByIndex(logicalCell)
  const table = tableCell?.table
  const tr = tableCell?.tr
  const td = tableCell?.td
  if (!table?.id || !tr?.id || !td?.id) {
    return null
  }
  if (td.rowspan > 1 || td.colspan > 1) {
    return null
  }

  const activeSlice = deps.resolveSliceByPositionContext(positionContext)
  const sourceSliceList = deps.getCellSlicesByLogicalCell({
    tableId: table.id,
    trId: tr.id,
    tdId: td.id
  })
  const sliceList = sourceSliceList.map(slice => ({
    absoluteStart: slice.absoluteStart,
    absoluteEnd: slice.absoluteEnd
  }))
  if (sliceList.length <= 1) {
    return null
  }
  if (direction === 'prev' && activeSlice) {
    const activeSliceIndex = sourceSliceList.findIndex(
      slice =>
        slice.fragmentTableId === activeSlice.fragmentTableId &&
        slice.fragmentTrId === activeSlice.fragmentTrId &&
        slice.fragmentTdId === activeSlice.fragmentTdId
    )
    const activeSliceStartIndex =
      activeSlice.positionList[0]?.index ?? activeSlice.absoluteStart
    if (
      activeSliceIndex > 0 &&
      cursorIndex >= activeSliceStartIndex &&
      cursorIndex < activeSlice.absoluteStart
    ) {
      return Math.max(0, sliceList[activeSliceIndex - 1].absoluteEnd - 1)
    }
  }

  const currentSliceIndex = sliceList.findIndex(
    (slice, index) =>
      (cursorIndex >= slice.absoluteStart && cursorIndex < slice.absoluteEnd) ||
      (!!sliceList[index + 1] &&
        cursorIndex >= slice.absoluteEnd - 1 &&
        cursorIndex < sliceList[index + 1].absoluteStart)
  )
  if (currentSliceIndex < 0) {
    return null
  }

  if (direction === 'prev') {
    if (currentSliceIndex === 0) {
      return null
    }
    const currentSlice = sliceList[currentSliceIndex]
    if (cursorIndex !== currentSlice.absoluteStart) {
      return null
    }
    return Math.max(0, sliceList[currentSliceIndex - 1].absoluteEnd - 1)
  }

  if (currentSliceIndex >= sliceList.length - 1) {
    return null
  }
  const currentSlice = sliceList[currentSliceIndex]
  if (cursorIndex !== currentSlice.absoluteEnd - 1) {
    return null
  }
  return sliceList[currentSliceIndex + 1].absoluteStart
}
