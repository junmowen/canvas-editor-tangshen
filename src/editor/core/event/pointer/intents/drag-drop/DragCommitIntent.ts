import { IElement } from '../../../../../interface/Element'
import { isEditorDisabled } from '../../../../shared/utils/editorState'
import { CanvasEvent } from '../../../CanvasEvent'
import { IPointerCoordinatePayload } from '../../coordinates/PointerCoordinateTypes'
import {
  hasControlElement,
  isAllowedControlDrag
} from '../../../../modules/control/policy/ControlDragPolicy'
import { emitControlDragDropContentChange } from '../../../../modules/control/interaction/applyControlDragDropMutation'
import {
  isFloatingImageElement,
  isImageLikeDragElement,
  isSurroundImageElement,
  moveDraggedImagePosition,
  repaintDraggedImageResizer,
  showImageResizer
} from '../../../../modules/image/interaction/ImageDragInteraction'
import { isDragDropWithinSameTableCell } from '../../../../modules/table/interaction/isDragDropWithinSameTableCell'
import {
  renderDragCommitApplied,
  renderDragCommitBlocked,
  renderDragCommitFailed,
  renderDragCommitRollback
} from '../../effects/PointerRenderEffect'
import { applyDragCommitMutation } from './DragCommitMutationIntent'

export function runDragCommitIntent(payload: {
  /** 宿主容器节点，用于承载编辑器或渲染表面。 */
  host: CanvasEvent
  /** 原始 DOM 事件对象，用于读取指针、键盘或剪贴板信息。 */
  evt: MouseEvent
  /** 指针坐标集合，用于统一页面坐标和客户端坐标。 */
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
    isDragDropWithinSameTableCell({
      snapshotPositionContext: session.dragSnapshot.positionContext,
      positionContext
    })
  ) {
    draw.clearSideEffect()
    let isSubmitHistory = false
    let isCompute = false
    if (isCacheRangeCollapsed) {
      const dragElement = cacheElementList[cacheEndIndex]
      if (isImageLikeDragElement(dragElement)) {
        moveDraggedImagePosition({
          draw,
          element: dragElement,
          viewport: coordinates.viewport,
          startViewport: session.mouseDownStartCoordinates?.viewport
        })
        if (isFloatingImageElement(dragElement)) {
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
        isCompute = isSurroundImageElement(dragElement)
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
  const isContainControl = hasControlElement(dragElementList)
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
    if (isImageLikeDragElement(dragElement)) {
      moveDraggedImagePosition({
        draw,
        element: dragElement,
        viewport: coordinates.viewport,
        startViewport: session.mouseDownStartCoordinates?.viewport
      })
      imgElement = dragElement
    }
  }
  renderDragCommitApplied({ draw })
  emitControlDragDropContentChange({
    control,
    activeControl: mutationResult.activeControl,
    cacheStartElement: mutationResult.cacheStartElement,
    cacheRange,
    cacheElementList
  })
  if (imgElement) {
    repaintDraggedImageResizer({
      draw,
      element: imgElement,
      rangeEndIndex: mutationResult.rangeEndIndex
    })
  }
  return true
}
