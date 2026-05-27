import { ImageDisplay } from '../../../../../dataset/enum/Common'
import { ElementType } from '../../../../../dataset/enum/Element'
import { IElement } from '../../../../../interface/Element'
import { isEditorDisabled } from '../../../../utils/editorState'
import { CanvasEvent } from '../../../CanvasEvent'
import { IPointerCoordinatePayload } from '../../coordinates/PointerCoordinateTypes'
import { isAllowedControlDrag } from '../../policies/ControlDragPolicy'
import {
  repaintDraggedImageResizer,
  showImageResizer
} from '../../effects/PreviewerEffect'
import {
  renderDragCommitApplied,
  renderDragCommitBlocked,
  renderDragCommitFailed,
  renderDragCommitRollback
} from '../../effects/PointerRenderEffect'
import { applyDragCommitMutation } from './DragCommitMutationIntent'

function moveImgPosition(
  element: IElement,
  coordinates: IPointerCoordinatePayload,
  host: CanvasEvent
) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  const session = host.getPointerSession()
  if (
    element.imgDisplay === ImageDisplay.SURROUND ||
    element.imgDisplay === ImageDisplay.FLOAT_TOP ||
    element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
  ) {
    const startViewport = session.mouseDownStartCoordinates?.viewport
    if (!startViewport) {
      components.imageParticle.destroyFloatImage()
      return
    }
    const moveX = coordinates.viewport.x - startViewport.x
    const moveY = coordinates.viewport.y - startViewport.y
    const imgFloatPosition = element.imgFloatPosition!
    element.imgFloatPosition = {
      x: imgFloatPosition.x + moveX,
      y: imgFloatPosition.y + moveY,
      pageNo: draw.getPageNo()
    }
  }
  components.imageParticle.destroyFloatImage()
}

export function runDragCommitIntent(payload: {
  host: CanvasEvent
  evt: MouseEvent
  coordinates: IPointerCoordinatePayload
}): boolean {
  const { host, evt, coordinates } = payload
  const draw = host.getDraw()
  const session = host.getPointerSession()
  const components = draw.getComponents()
  if (!session.isAllowDrop) return false
  if (isEditorDisabled(draw)) {
    host.mousedown(evt)
    return true
  }
  const positionContext = draw.getCoordinate().getPositionContext()
  const rangeManager = components.range
  const cacheRange = session.dragSnapshot.range!
  const cacheElementList = session.dragSnapshot.elementList!
  const cachePositionList = session.dragSnapshot.positionList!
  const cachePositionContext = session.dragSnapshot.positionContext
  const range = rangeManager.getEditBoundaryRange()
  const isCacheRangeCollapsed = cacheRange.startIndex === cacheRange.endIndex
  const cacheStartIndex = isCacheRangeCollapsed
    ? cacheRange.startIndex - 1
    : cacheRange.startIndex
  const cacheEndIndex = cacheRange.endIndex
  const isRowHandleDrag = session.dragSnapshot.dragSource === 'row-handle'

  if (
    range.startIndex >= cacheStartIndex &&
    range.endIndex <= cacheEndIndex &&
    session.dragSnapshot.positionContext?.tdId === positionContext.tdId
  ) {
    draw.clearSideEffect()
    let isSubmitHistory = false
    let isCompute = false
    if (isCacheRangeCollapsed) {
      const dragElement = cacheElementList[cacheEndIndex]
      if (
        dragElement.type === ElementType.IMAGE ||
        dragElement.type === ElementType.LATEX
      ) {
        moveImgPosition(dragElement, coordinates, host)
        if (
          dragElement.imgDisplay === ImageDisplay.SURROUND ||
          dragElement.imgDisplay === ImageDisplay.FLOAT_TOP ||
          dragElement.imgDisplay === ImageDisplay.FLOAT_BOTTOM
        ) {
          showImageResizer({ draw, element: dragElement })
          isSubmitHistory = true
        } else {
          const cachePosition = cachePositionList[cacheEndIndex]
          showImageResizer({
            draw,
            element: dragElement,
            position: cachePosition
          })
        }
        isCompute = dragElement.imgDisplay === ImageDisplay.SURROUND
      }
    }
    rangeManager.replaceRange({
      ...cacheRange
    })
    renderDragCommitRollback({ draw, isCompute, isSubmitHistory })
    return true
  }

  if (isRowHandleDrag) {
    const isDropBeforeSelf = range.startIndex === cacheStartIndex
    const isDropAfterSelf = range.startIndex === cacheEndIndex
    if (isDropBeforeSelf || isDropAfterSelf) {
      draw.clearSideEffect()
      rangeManager.replaceRange({
        ...cacheRange
      })
      renderDragCommitRollback({ draw, isCompute: false, isSubmitHistory: false })
      return true
    }
  }

  const dragElementList = cacheElementList.slice(
    cacheStartIndex + 1,
    cacheEndIndex + 1
  )
  const isContainControl = dragElementList.find(element => element.controlId)
  if (isContainControl) {
    const cacheStartElement = cacheElementList[cacheStartIndex + 1]
    const cacheEndElement = cacheElementList[cacheEndIndex]
    if (!isAllowedControlDrag(cacheStartElement, cacheEndElement)) {
      renderDragCommitBlocked({ draw, curIndex: range.startIndex })
      return true
    }
  }

  const control = components.control
  const mutationResult = applyDragCommitMutation({
    draw,
    range,
    cacheRange,
    cacheElementList,
    cachePositionList,
    cachePositionContext,
    cacheStartIndex,
    cacheEndIndex,
    dragElementList,
    isContainControl: !!isContainControl,
    isPreserveSourceContext: isRowHandleDrag
  })
  if (!mutationResult.applied) {
    renderDragCommitFailed({ draw })
    return true
  }
  draw.clearSideEffect()
  let imgElement: IElement | null = null
  if (isCacheRangeCollapsed) {
    const activeElementList = draw.getObjectResolver().getElementList()
    const dragElement = activeElementList[mutationResult.rangeEndIndex]
    if (
      dragElement.type === ElementType.IMAGE ||
      dragElement.type === ElementType.LATEX
    ) {
      moveImgPosition(dragElement, coordinates, host)
      imgElement = dragElement
    }
  }
  renderDragCommitApplied({ draw })
  if (mutationResult.activeControl) {
    control.emitControlContentChange()
  } else if (mutationResult.cacheStartElement.controlId) {
    control.emitControlContentChange({
      context: {
        range: cacheRange,
        elementList: cacheElementList
      },
      controlElement: mutationResult.cacheStartElement
    })
  }
  if (imgElement) {
    repaintDraggedImageResizer({
      draw,
      element: imgElement,
      rangeEndIndex: mutationResult.rangeEndIndex
    })
  }
  return true
}
