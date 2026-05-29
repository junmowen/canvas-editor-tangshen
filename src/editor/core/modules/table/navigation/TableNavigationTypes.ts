import { IPositionContext } from '../../../../interface/Position'
import { IRange } from '../../../../interface/Range'

/** 表格navigationdirection，限定移动、遍历或绘制时允许的方向取值。 */
export type TTableNavigationDirection = 'prev' | 'next'
/** 表格verticalnavigationdirection，限定移动、遍历或绘制时允许的方向取值。 */
export type TTableVerticalNavigationDirection = 'up' | 'down'

/** 表格片段transitionrequest契约，用于约束内部流程中传递的数据结构。 */
export interface ITableFragmentTransitionRequest {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: TTableNavigationDirection
}

/** 表格adjacent单元格navigationrequest契约，用于约束内部流程中传递的数据结构。 */
export interface ITableAdjacentCellNavigationRequest {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: TTableNavigationDirection
}

export interface ITableAdjacentCellNavigationResult {
  /** 下一个位置上下文，用于继续查找相邻命中点。 */
  nextPositionContext: IPositionContext | null
  /** 下一个元素索引，用于继续遍历或查找。 */
  nextIndex: number
  /** 表格工具销毁函数，用于清理浮层和事件状态。 */
  disposeTableTool?: boolean
}

/** 表格horizontalboundarynavigationrequest契约，用于约束内部流程中传递的数据结构。 */
export interface ITableHorizontalBoundaryNavigationRequest {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: TTableNavigationDirection
}

/** 表格verticalnavigationrequest契约，用于约束内部流程中传递的数据结构。 */
export interface ITableVerticalNavigationRequest {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: TTableVerticalNavigationDirection
}

export interface ITableVerticalNavigationResult {
  /** 下一个位置上下文，用于继续查找相邻命中点。 */
  nextPositionContext: IPositionContext | null
  /** 下一个元素索引，用于继续遍历或查找。 */
  nextIndex: number
  /** 表格工具销毁函数，用于清理浮层和事件状态。 */
  disposeTableTool?: boolean
}

/** 表格backspacenavigationrequest契约，用于约束内部流程中传递的数据结构。 */
export interface ITableBackspaceNavigationRequest {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
}

export interface ITableBackspaceNavigationResult {
  /** 下一个位置上下文，用于继续查找相邻命中点。 */
  nextPositionContext: IPositionContext
  /** 下一个元素索引，用于继续遍历或查找。 */
  nextIndex: number
}

/** 表格verticalentrynavigationrequest契约，用于约束内部流程中传递的数据结构。 */
export interface ITableVerticalEntryNavigationRequest {
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex: number
  /** 光标横坐标，用于计算行内插入位置。 */
  cursorX: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: TTableVerticalNavigationDirection
}

export interface ITableVerticalEntryNavigationResult {
  /** 下一个位置上下文，用于继续查找相邻命中点。 */
  nextPositionContext: IPositionContext
  /** 下一个元素索引，用于继续遍历或查找。 */
  nextIndex: number
}
