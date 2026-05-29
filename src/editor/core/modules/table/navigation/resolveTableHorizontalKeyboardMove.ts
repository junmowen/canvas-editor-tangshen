import { IElement } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'
import { applyTableToolState } from '../interaction/applyTableToolState'
import { TTableNavigationDirection } from './TableNavigationTypes'

/** 横向键盘移动抵达表格边界时，解析跨表格/跨单元格的新光标位置。 */
export function resolveTableHorizontalKeyboardMove(payload: {
  /** 绘制核心实例，提供坐标、range 和表格导航服务。 */
  draw: Draw
  /** 移动方向。 */
  direction: TTableNavigationDirection
}): {
  /** 锚点索引。 */
  nextIndex: number
  /** 是否需要刷新元素列表。 */
  shouldRefreshElementList: boolean
  /** 刷新后的元素列表。 */
  elementList?: IElement[]
} | null {
  const { draw, direction } = payload
  const coordinate = draw.getCoordinate()
  const navigationResult =
    draw.getComponents().tableNavigationService.resolveHorizontalBoundaryNavigation({
      positionContext: coordinate.getPositionContext(),
      range: draw.getComponents().range.getEditBoundaryRange(),
      direction
    })
  if (!navigationResult?.nextPositionContext) return null

  coordinate.setPositionContext(navigationResult.nextPositionContext)
  const shouldRefreshElementList =
    !!navigationResult.disposeTableTool && direction === 'next'
  applyTableToolState(draw, !!navigationResult.disposeTableTool)
  return {
    nextIndex: navigationResult.nextIndex,
    shouldRefreshElementList,
    elementList: shouldRefreshElementList
      ? draw.getObjectResolver().getElementList()
      : undefined
  }
}
