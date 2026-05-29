import { ICurrentPosition, IPositionContext } from '../../../../interface/Position'
import { IRange } from '../../../../interface/Range'
import { Draw } from '../../../draw/Draw'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'
import { createTablePositionContext } from '../navigation/TableNavigationAlgorithms'

/** 表格拖选命中契约，用于约束表格单元格内文本和单元格范围切换。 */
export interface ITableDragSelectionHit {
  object: 'table-text'
  /** 边界索引，用于定位控件或选区的临界元素。 */
  boundaryIndex: number
  /** 命中索引，用于定位对应元素、行或片段。 */
  hitIndex?: number
  /** 是否右侧boundary命中，用于控制当前流程的判断分支。 */
  isRightBoundaryHit?: boolean
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
  /** 表格行标识，用于关联行位置、片段和选区。 */
  trId?: string
  /** 单元格标识，用于关联单元格位置、片段和选区。 */
  tdId?: string
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 切片信息，用于描述表格或元素列表中的局部范围。 */
  slice?: ITableLayoutCellSlice | null
}

/** 表格拖选范围结果契约。 */
interface IResolvedTableDragSelectionRange {
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext?: IPositionContext
  /** 是否选区drag，用于控制当前流程的判断分支。 */
  hasSelectionDrag: boolean
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

/** 判断当前表格命中是否落在字符右边界。 */
function resolveTableRightBoundaryHit(payload: {
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: ICurrentPosition
  /** 命中索引，用于定位对应元素、行或片段。 */
  hitIndex?: number
  /** 切片信息，用于描述表格或元素列表中的局部范围。 */
  slice?: ITableLayoutCellSlice | null
}): boolean {
  const { position, hitIndex, slice } = payload
  if (position.forceNotRightBoundaryHit) return false
  if (hitIndex === undefined || position.x === undefined || !slice) return false
  const hitPosition = slice.positionList[hitIndex - slice.absoluteStart]
  const rightX = hitPosition?.coordinate.rightTop[0]
  return rightX !== undefined ? position.x >= rightX - 1 : false
}

export function createTableDragSelectionHit(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: ICurrentPosition
  /** 边界索引，用于定位控件或选区的临界元素。 */
  boundaryIndex: number
  /** 命中索引，用于定位对应元素、行或片段。 */
  hitIndex?: number
}): ITableDragSelectionHit {
  const { draw, position, boundaryIndex, hitIndex } = payload
  const slice = getTableSlice(draw, position)
  return {
    object: 'table-text',
    boundaryIndex,
    hitIndex,
    tableId: position.tableId,
    trId: position.trId,
    tdId: position.tdId,
    trIndex: position.trIndex,
    tdIndex: position.tdIndex,
    slice,
    isRightBoundaryHit: resolveTableRightBoundaryHit({
      position,
      hitIndex,
      slice
    })
  }
}

function getLogicalTableCell(hit: ITableDragSelectionHit) {
  return {
    tableIndex: hit.slice?.logicalTableIndex,
    trIndex: hit.slice?.logicalTrIndex ?? hit.trIndex,
    tdIndex: hit.slice?.logicalTdIndex ?? hit.tdIndex,
    tableId: hit.slice?.logicalTableId ?? hit.tableId
  }
}

/** 判断当前状态是否命中同一个逻辑表格单元格。 */
export function isSameTableDragSelectionCell(
  startHit: ITableDragSelectionHit,
  endHit: ITableDragSelectionHit
): boolean {
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

export function isSameTableDragSelectionFragment(
  startHit: ITableDragSelectionHit,
  endHit: ITableDragSelectionHit
): boolean {
  return !!(
    startHit.tableId &&
    startHit.tableId === endHit.tableId &&
    startHit.trId === endHit.trId &&
    startHit.tdId === endHit.tdId
  )
}

/** 判断是否应该选中单个表格单元格。 */
export function shouldSelectSingleTableCell(payload: {
  /** 起点命中结果，用于记录范围左侧的指针解析状态。 */
  startHit: ITableDragSelectionHit
  /** 终点命中结果，用于记录范围右侧的指针解析状态。 */
  endHit: ITableDragSelectionHit
  /** 起始坐标，用于记录拖拽或选区开始位置。 */
  startPosition: ICurrentPosition
  /** pointerx数值，用于当前布局、统计或索引计算。 */
  pointerX?: number
  /** pointery数值，用于当前布局、统计或索引计算。 */
  pointerY?: number
}) {
  const { startHit, endHit, startPosition, pointerX, pointerY } = payload
  if (!isSameTableDragSelectionCell(startHit, endHit)) return false
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

export function createTableDragPositionContext(
  hit: ITableDragSelectionHit
): IPositionContext {
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

export function resolveTableCellDragSelection(payload: {
  /** 起点命中结果，用于记录范围左侧的指针解析状态。 */
  startHit: ITableDragSelectionHit
  /** 终点命中结果，用于记录范围右侧的指针解析状态。 */
  endHit: ITableDragSelectionHit
}): IResolvedTableDragSelectionRange | null {
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
    positionContext: createTableDragPositionContext(endHit),
    hasSelectionDrag: false
  }
}
