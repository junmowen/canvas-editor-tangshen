import { ImageDisplay } from '../../../../../dataset/enum/Common'
import { ElementType } from '../../../../../dataset/enum/Element'
import { CanvasEvent } from '../../../CanvasEvent'

export function runDragHoverIntent(payload: {
  host: CanvasEvent
  evt: MouseEvent
}): boolean {
  const { host, evt } = payload
  const draw = host.getDraw()
  const components = draw.getComponents()
  const session = host.getPointerSession()
  if (!session.isAllowDrag) return false
  const coordinates = draw.getPointerCoordinates(evt, session.lastPointerCoordinates)
  const pagePoint = coordinates.page
  const { startIndex, endIndex } = session.dragSnapshot.range!
  const positionList = session.dragSnapshot.positionList!
  const isCollapsedDragSnapshot = startIndex === endIndex

  if (pagePoint) {
    for (let p = startIndex + 1; p <= endIndex; p++) {
      const currentPosition = positionList[p]
      if (!currentPosition || currentPosition.pageNo !== pagePoint.pageNo) continue
      const {
        coordinate: { leftTop, rightBottom }
      } = currentPosition
      if (
        pagePoint.x >= leftTop[0] &&
        pagePoint.x <= rightBottom[0] &&
        pagePoint.y >= leftTop[1] &&
        pagePoint.y <= rightBottom[1]
      ) {
        session.lastPointerCoordinates = coordinates
        return true
      }
    }
  }

  const cacheStartIndex = session.dragSnapshot.range?.startIndex
  if (cacheStartIndex) {
    const dragElement = session.dragSnapshot.elementList![cacheStartIndex]
    if (
      dragElement?.type === ElementType.IMAGE &&
      (dragElement.imgDisplay === ImageDisplay.SURROUND ||
        dragElement.imgDisplay === ImageDisplay.FLOAT_TOP ||
        dragElement.imgDisplay === ImageDisplay.FLOAT_BOTTOM)
    ) {
      components.previewer.clearResizer()
      components.imageParticle.dragFloatImage(
        coordinates.deltaViewport.x,
        coordinates.deltaViewport.y
      )
      host.dragover(evt)
      session.isAllowDrop = true
      session.lastPointerCoordinates = coordinates
      return true
    }
  }

  if (!isCollapsedDragSnapshot) {
    session.lastPointerCoordinates = coordinates
    return true
  }

  session.lastPointerCoordinates = coordinates
  return true
}
