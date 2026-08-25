import { CanvasEvent } from '../../CanvasEvent'
import { runChartGraphicDragInteraction } from '../../../modules/chart-graphics/interaction/ChartGraphicDragInteraction'
import { runDragHoverIntent } from '../intents/drag-drop/DragHoverIntent'
import { runSelectionDragIntent } from '../intents/selection/SelectionDragIntent'

export function dispatchPointerMoveIntent(payload: {
  host: CanvasEvent
  evt: MouseEvent
}): void {
  const { host, evt } = payload
  const session = host.getPointerSession()
  if (session.chartGraphicDrag) {
    runChartGraphicDragInteraction({ host, evt })
    return
  }
  if (session.isAllowDrag) {
    runDragHoverIntent({ host, evt })
    return
  }
  runSelectionDragIntent({ host, evt })
}
