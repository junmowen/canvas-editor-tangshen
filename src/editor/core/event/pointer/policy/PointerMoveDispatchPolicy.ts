import { CanvasEvent } from '../../CanvasEvent'
import { runChartGraphicDragIntent } from '../intents/chart-graphics/ChartGraphicDragIntent'
import { runDragHoverIntent } from '../intents/drag-drop/DragHoverIntent'
import { runSelectionDragIntent } from '../intents/selection/SelectionDragIntent'

export function dispatchPointerMoveIntent(payload: {
  host: CanvasEvent
  evt: MouseEvent
}): void {
  const { host, evt } = payload
  const session = host.getPointerSession()
  if (session.chartGraphicDrag) {
    runChartGraphicDragIntent({ host, evt })
    return
  }
  if (session.isAllowDrag) {
    runDragHoverIntent({ host, evt })
    return
  }
  runSelectionDragIntent({ host, evt })
}
