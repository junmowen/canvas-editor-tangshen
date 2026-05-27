import { CanvasEvent } from '../../CanvasEvent'

export function resolvePointerHitIntent(payload: {
  host: CanvasEvent
  evt: MouseEvent
}) {
  const { host, evt } = payload
  const draw = host.getDraw()
  const components = draw.getComponents()
  const pagePoint = draw.getCoordinate().getPointerCoordinates(evt).page
  if (!pagePoint) return null
  const hitTestResult = components.tableHitTestService.resolve({
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
