import { CanvasEvent } from '../../CanvasEvent'
import { resolveTablePointerHit } from '../../../modules/table/hittest/resolveTablePointerHit'

export function resolvePointerHitIntent(payload: {
  /** 宿主容器节点，用于承载编辑器或渲染表面。 */
  host: CanvasEvent
  /** 原始 DOM 事件对象，用于读取指针、键盘或剪贴板信息。 */
  evt: MouseEvent
}) {
  const { host, evt } = payload
  const draw = host.getDraw()
  const pagePoint = draw.getCoordinate().getPointerCoordinates(evt).page
  if (!pagePoint) return null
  const hitTestResult = resolveTablePointerHit({
    draw,
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: Number(pagePoint.pageIndex),
    pagePoint,
    startPosition: null
  })
  return {
    pagePoint,
    hitTestResult
  }
}
