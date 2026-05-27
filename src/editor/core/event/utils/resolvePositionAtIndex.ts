import { IElementPosition } from '../../../interface/Element'
import { Draw } from '../../draw/Draw'

interface IResolvePositionAtIndexOptions {
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
    return positionList[index] || null
  }
  if (options.fallbackToLast && positionList.length) {
    return positionList[positionList.length - 1] || null
  }
  return null
}
