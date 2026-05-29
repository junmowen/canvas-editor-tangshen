import { IElementPosition } from '../../../interface/Element'
import { Draw } from '../../draw/Draw'

/** resolve位置at索引选项契约，用于约束内部流程中传递的数据结构。 */
interface IResolvePositionAtIndexOptions {
  /** 降级tolast开关，用于控制当前流程的判断分支。 */
  fallbackToLast?: boolean
}

// 坐标列表是渲染后的统一索引源，这里只负责按索引安全取点，避免各处重复做边界兜底。
export function resolvePositionAtIndex(
  draw: Draw,
  index: number,
  options: IResolvePositionAtIndexOptions = {}
): IElementPosition | null {
  const positionList = draw.getCoordinate().getPositionList()
  if (index >= 0 && index < positionList.length) {
    const position = positionList[index]
    if (position?.index === index) {
      return position
    }
  }
  const matchedPosition = positionList.find(position => position.index === index)
  if (matchedPosition) {
    return matchedPosition
  }
  const cursorPosition = draw.getCoordinate().getCursorPosition()
  if (cursorPosition?.index === index) {
    return cursorPosition
  }
  if (options.fallbackToLast && positionList.length) {
    return positionList[positionList.length - 1] || null
  }
  return null
}
