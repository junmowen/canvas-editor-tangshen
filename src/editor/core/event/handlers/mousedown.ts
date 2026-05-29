import { CanvasEvent } from '../CanvasEvent'
import { debugMousedown } from '../debug/mousedown'
import { keepContextMenuSelectionAction } from '../pointer/actions/KeepContextMenuSelectionAction'
import { startSelectedRangeDragAction } from '../pointer/actions/StartSelectedRangeDragAction'
import { startRowDragAction } from '../pointer/actions/StartRowDragAction'
import { startSelectionAction } from '../pointer/actions/StartSelectionAction'

/**
 * 处理鼠标按下事件。
 *
 * 处理范围选择、控件点击、表格操作、图片拖拽、超链接点击等逻辑。
 *
 * @param evt - 鼠标事件
 * @param host - Canvas 事件主机
 */
export function mousedown(evt: MouseEvent, host: CanvasEvent) {
  debugMousedown(evt, host)
  try {
    const draw = host.getDraw()
    const session = host.getPointerSession()
    const coordinates = draw.getCoordinate().getPointerCoordinates(evt, session.lastPointerCoordinates)
    const pagePoint = coordinates.page

    if (keepContextMenuSelectionAction({ evt, host, coordinates })) {
      return
    }
    if (
      pagePoint &&
      startSelectedRangeDragAction({ host, pagePoint, coordinates })
    ) {
      return
    }

    if (!pagePoint) {
      session.lastPointerCoordinates = coordinates
      return
    }
    draw.setPageNo(pagePoint.pageNo)

    if (startRowDragAction({ evt, host, pagePoint, coordinates })) {
      return
    }
    startSelectionAction({ evt, host, pagePoint, coordinates })
  } finally {
    debugMousedown(evt, host, 'after')
  }
}
