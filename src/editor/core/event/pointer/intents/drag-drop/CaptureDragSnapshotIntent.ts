import { deepClone } from '../../../../../utils'
import { CanvasEvent } from '../../../CanvasEvent'

export function captureDragSnapshot(
  host: CanvasEvent,
  options: {
    dragSource?: 'row-handle' | null
  } = {}
) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  const session = host.getPointerSession()
  session.isAllowDrag = true
  session.dragSnapshot.range = deepClone(components.range.getEditBoundaryRange())
  session.dragSnapshot.elementList = draw.getElementList()
  session.dragSnapshot.positionList = components.position.getPositionList()
  session.dragSnapshot.positionContext = components.position.getPositionContext()
  session.dragSnapshot.dragSource = options.dragSource || null
}
