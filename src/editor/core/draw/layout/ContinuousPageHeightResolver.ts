import { IElement, IElementPosition } from '../../../interface/Element'
import type { IFloatPosition } from '../../../interface/Position'
import { resolveScaledFloatImageRect } from '../../modules/image/position/ImagePositionPolicy'
import {
  visitTableCellValueList
} from '../../modules/table/layout/TableRowLayoutPolicy'
import type { Draw } from '../Draw'

function resolveFloatPositionBottom(
  floatPosition: IFloatPosition,
  scale: number
) {
  const coordinate = floatPosition.position?.coordinate
  if (coordinate) {
    return Math.max(
      coordinate.leftBottom[1],
      coordinate.rightBottom[1]
    )
  }
  const floatRect = resolveScaledFloatImageRect({
    element: floatPosition.element,
    scale
  })
  return floatRect ? floatRect.y + floatRect.height : null
}

/** 解析连续模式下需要撑开的页面高度。 */
export function resolveContinuousPageHeight(
  draw: Draw,
  baseHeight: number
): number {
  if (draw.getIsPagingMode()) {
    return baseHeight
  }
  const bottomMargin = draw.getMargins()[2]
  let maxBottom = 0
  const visitPositionList = (positionList?: IElementPosition[]) => {
    if (!positionList?.length) {
      return
    }
    for (let i = 0; i < positionList.length; i++) {
      const position = positionList[i]
      if (!position) continue
      maxBottom = Math.max(
        maxBottom,
        position.coordinate.leftBottom[1],
        position.coordinate.rightBottom[1]
      )
    }
  }
  const visitElementList = (elementList: IElement[]) => {
    for (let i = 0; i < elementList.length; i++) {
      const element = elementList[i]
      visitTableCellValueList({
        element,
        tableIndex: i,
        visitor: ({ td }) => {
          visitPositionList(td.positionList)
          visitElementList(td.value || [])
        }
      })
    }
  }
  visitPositionList(draw.getCoordinate().getMainPositionList())
  visitElementList(draw.getObjectResolver().getLayoutMainElementList())
  const { scale } = draw.getRuntime().getOptions()
  draw.getCoordinate().getFloatPositionList().forEach(floatPosition => {
    const floatBottom = resolveFloatPositionBottom(floatPosition, scale)
    if (floatBottom !== null) {
      maxBottom = Math.max(maxBottom, floatBottom)
    }
  })
  return Math.max(baseHeight, Math.ceil(maxBottom + bottomMargin))
}
