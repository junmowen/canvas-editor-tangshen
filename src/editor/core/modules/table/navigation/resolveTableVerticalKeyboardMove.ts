import { IElementPosition } from '../../../../interface/Element'
import { IPositionContext } from '../../../../interface/Position'
import { Draw } from '../../../draw/Draw'
import { applyTableToolState } from '../interaction/applyTableToolState'
import { TTableVerticalNavigationDirection } from './TableNavigationTypes'

/** 表格内纵向键盘移动结果。 */
interface ITableVerticalKeyboardMoveResult {
  /** 是否已由表格导航处理。 */
  handled: boolean
  /** 锚点索引。 */
  nextIndex: number
  /** 最新布局位置列表。 */
  positionList: IElementPosition[]
}

/** 纵向键盘移动处于表格上下文时，解析跨分页/跨行/出入表格的新光标位置。 */
export function resolveTableVerticalKeyboardMove(payload: {
  /** 绘制核心实例，提供坐标和表格导航服务。 */
  draw: Draw
  /** 光标索引。 */
  cursorIndex: number
  /** 是否按住 Shift。 */
  isShiftKey: boolean
  /** 移动方向。 */
  direction: TTableVerticalNavigationDirection
}): ITableVerticalKeyboardMoveResult | null {
  const { draw, cursorIndex, isShiftKey, direction } = payload
  const coordinate = draw.getCoordinate()
  const positionContext = coordinate.getPositionContext()
  if (isShiftKey || !positionContext.isTable) return null

  const navigationResult =
    draw.getComponents().tableNavigationService.resolveVerticalNavigation({
      positionContext,
      cursorIndex,
      direction
    })
  if (!navigationResult) {
    return {
      handled: false,
      nextIndex: -1,
      positionList: coordinate.getPositionList()
    }
  }

  if (navigationResult.nextPositionContext) {
    coordinate.setPositionContext(navigationResult.nextPositionContext)
  }
  applyTableToolState(draw, !!navigationResult.disposeTableTool)
  return {
    handled: true,
    nextIndex: navigationResult.nextIndex,
    positionList: coordinate.getPositionList()
  }
}

/** 普通纵向移动跨过表格分页片段时，解析应该落到的片段边界。 */
export function resolveTableVerticalKeyboardFragmentTransition(payload: {
  /** 绘制核心实例，提供表格导航服务。 */
  draw: Draw
  /** 当前命中位置上下文。 */
  positionContext: IPositionContext
  /** 当前光标索引。 */
  cursorIndex: number
  /** 当前光标页码。 */
  cursorPageNo: number
  /** 下一位置页码。 */
  nextPositionPageNo?: number
  /** 是否按住 Shift。 */
  isShiftKey: boolean
}) {
  const {
    draw,
    positionContext,
    cursorIndex,
    cursorPageNo,
    nextPositionPageNo,
    isShiftKey
  } = payload
  return draw.getComponents().tableNavigationService.resolveVerticalFragmentTransition({
    positionContext,
    cursorIndex,
    cursorPageNo,
    nextPositionPageNo,
    isShiftKey
  })
}

/** 普通纵向移动命中表格元素入口时，解析进入目标单元格的位置。 */
export function resolveTableVerticalKeyboardEntry(payload: {
  /** 绘制核心实例，提供对象和表格导航服务。 */
  draw: Draw
  /** 命中的文档元素索引。 */
  tableIndex: number
  /** 光标横坐标。 */
  cursorX: number
  /** 移动方向。 */
  direction: TTableVerticalNavigationDirection
}): {
  /** 锚点索引。 */
  nextIndex: number
  /** 最新布局位置列表。 */
  positionList: IElementPosition[]
} | null {
  const { draw, tableIndex, cursorX, direction } = payload
  const navigationResult =
    draw.getComponents().tableNavigationService.resolveVerticalEntryNavigation({
      tableIndex,
      cursorX,
      direction
    })
  if (!navigationResult) return null

  const coordinate = draw.getCoordinate()
  coordinate.setPositionContext(navigationResult.nextPositionContext)
  applyTableToolState(draw, false)
  return {
    nextIndex: navigationResult.nextIndex,
    positionList: coordinate.getPositionList()
  }
}
