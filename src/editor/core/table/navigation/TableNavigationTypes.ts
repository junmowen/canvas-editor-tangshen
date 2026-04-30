import { IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'

/** 水平导航统一只关心“前一个 / 后一个”。 */
export type TTableNavigationDirection = 'prev' | 'next'
/** 垂直导航统一只关心“上 / 下”。 */
export type TTableVerticalNavigationDirection = 'up' | 'down'

/** 分页表格片段跳转输入。 */
export interface ITableFragmentTransitionRequest {
  positionContext: IPositionContext
  cursorIndex: number
  direction: TTableNavigationDirection
}

/** 左右键在表格边界上的相邻单元格跳转输入。 */
export interface ITableAdjacentCellNavigationRequest {
  positionContext: IPositionContext
  range: IRange
  direction: TTableNavigationDirection
}

/** 左右键表格边界跳转结果。 */
export interface ITableAdjacentCellNavigationResult {
  nextPositionContext: IPositionContext | null
  nextIndex: number
  disposeTableTool?: boolean
}

/** 左右键在文档与表格边界上的导航输入。 */
export interface ITableHorizontalBoundaryNavigationRequest {
  positionContext: IPositionContext
  range: IRange
  direction: TTableNavigationDirection
}

/** 上下键在表格边界上的垂直导航输入。 */
export interface ITableVerticalNavigationRequest {
  positionContext: IPositionContext
  cursorIndex: number
  direction: TTableVerticalNavigationDirection
}

/** 上下键表格边界跳转结果。 */
export interface ITableVerticalNavigationResult {
  nextPositionContext: IPositionContext | null
  nextIndex: number
  disposeTableTool?: boolean
}

/** Backspace 在分页表格边界上的导航输入。 */
export interface ITableBackspaceNavigationRequest {
  positionContext: IPositionContext
}

/** Backspace 在分页表格边界上的导航结果。 */
export interface ITableBackspaceNavigationResult {
  nextPositionContext: IPositionContext
  nextIndex: number
}

/** 正文上下移动后进入表格单元格的导航输入。 */
export interface ITableVerticalEntryNavigationRequest {
  tableIndex: number
  cursorX: number
  direction: TTableVerticalNavigationDirection
}

/** 正文上下移动后进入表格单元格的导航结果。 */
export interface ITableVerticalEntryNavigationResult {
  nextPositionContext: IPositionContext
  nextIndex: number
}
