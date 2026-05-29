import { deepClone } from '../../../../../utils'
import { CanvasEvent } from '../../../CanvasEvent'

/** 捕获 Drag Snapshot 对应的当前状态。 */
export function captureDragSnapshot(
  host: CanvasEvent,
  options: {
    /** 拖拽来源信息，用于提交时判断移动的数据范围。 */
    dragSource?: 'row-handle' | null
  } = {}
) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  const session = host.getPointerSession()
  session.isAllowDrag = true
  session.dragSnapshot.range = deepClone(components.range.getEditBoundaryRange())
  session.dragSnapshot.elementList = draw.getObjectResolver().getElementList()
  session.dragSnapshot.positionList = draw.getCoordinate().getPositionList()
  session.dragSnapshot.positionContext = draw.getCoordinate().getPositionContext()
  session.dragSnapshot.dragSource = options.dragSource || null
}
