import { IElement, IElementPosition } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

/** 拖拽提交跨入/跨出表格时，同步命中上下文索引偏移。 */
export function adjustTableDragDropPositionContext(payload: {
  /** 绘制核心实例，提供坐标上下文。 */
  draw: Draw
  /** 拖拽目标起始元素。 */
  startElement: IElement
  /** 拖拽源缓存起始元素。 */
  cacheStartElement: IElement
  /** 拖拽目标起始位置。 */
  startPosition: IElementPosition | null
  /** 拖拽源缓存起始位置。 */
  cacheStartPosition?: IElementPosition
  /** 插入替换的元素数量。 */
  replaceLength: number
}) {
  const {
    draw,
    startElement,
    cacheStartElement,
    startPosition,
    cacheStartPosition,
    replaceLength
  } = payload
  const coordinate = draw.getCoordinate()
  let positionContextIndex = coordinate.getPositionContext().index
  if (!positionContextIndex || !startPosition || !cacheStartPosition) return

  if (startElement.tableId && !cacheStartElement.tableId) {
    if (cacheStartPosition.index < positionContextIndex) {
      positionContextIndex -= replaceLength
    }
  } else if (!startElement.tableId && cacheStartElement.tableId) {
    if (startPosition.index < positionContextIndex) {
      positionContextIndex += replaceLength
    }
  }
  coordinate.setPositionContext({
    ...coordinate.getPositionContext(),
    index: positionContextIndex
  })
}
