import { ICurrentPosition } from '../../../../interface/Position'
import { Draw } from '../../../draw/Draw'
import { IPagePoint } from '../../../event/pointer/coordinates/PagePointTypes'
import { ITableHitTestResult } from './TableHitTestTypes'

/** resolve表格pointer命中调用载荷，聚合执行该操作所需的输入数据。 */
interface IResolveTablePointerHitPayload {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo?: number
  /** 页面内坐标，用于把指针位置映射到具体页。 */
  pagePoint: IPagePoint | null
  /** 起始坐标，用于记录拖拽或选区开始位置。 */
  startPosition: ICurrentPosition | null
}

export function resolveTablePointerHit(
  payload: IResolveTablePointerHitPayload
): ITableHitTestResult {
  const { draw, x, y, pageNo, pagePoint, startPosition } = payload
  return draw.getComponents().tableHitTestService.resolve({
    x,
    y,
    pageNo,
    pagePoint,
    startPosition
  })
}
