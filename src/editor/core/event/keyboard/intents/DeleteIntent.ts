import { CanvasEvent } from '../../CanvasEvent'
import { clearCrossRowColSelection } from '../shared/clearCrossRowColSelection'
import { finalizeDeletion } from '../shared/finalizeDeletion'
import { handleControlDeletion } from '../shared/handleControlDeletion'
import { removeHiddenElements } from '../shared/removeHiddenElements'

export function runDeleteIntent(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  if (draw.isReadonly()) return
  const rangeManager = components.range
  if (!rangeManager.getIsCanInput()) return
  const { startIndex, endIndex, isCrossRowCol } =
    rangeManager.getEditBoundaryRange()
  const elementList = draw.getElementList()
  const control = components.control
  const tableNavigationService = components.tableNavigationService
  if (rangeManager.getIsCollapsed()) {
    removeHiddenElements(host, 'next')
  }
  let curIndex: number | null
  let deletedCount = 1
  let editIndex = startIndex + 1
  if (isCrossRowCol) {
    curIndex = clearCrossRowColSelection(draw)
    if (curIndex === null) return
    deletedCount = Math.max(1, endIndex - startIndex)
    editIndex = startIndex + 1
  } else {
    if (
      control.getIsRangeControlDeletionDisabled({
        range: rangeManager.getEditBoundaryRange(),
        elementList
      })
    ) {
      evt.preventDefault()
      return
    }
    curIndex = handleControlDeletion(
      control,
      evt,
      () => !!(control.getActiveControl() && control.getIsRangeWithinControl())
    )
    if (curIndex === null && elementList[endIndex + 1]?.controlId) {
      curIndex = control.removeControl(endIndex + 1)
      deletedCount = 1
      editIndex = endIndex + 1
    }
    if (curIndex === null) {
      const position = components.position
      const cursorPosition = position.getCursorPosition()
      if (!cursorPosition) return
      const { index } = cursorPosition
      const positionContext = position.getPositionContext()
      if (positionContext.isDirectHit && positionContext.isImage) {
        draw.spliceElementList(elementList, index, 1)
        curIndex = index - 1
        deletedCount = 1
        editIndex = index
      } else {
        const isCollapsed = rangeManager.getIsCollapsed()
        if (!isCollapsed) {
          draw.spliceElementList(
            elementList,
            startIndex + 1,
            endIndex - startIndex
          )
          deletedCount = Math.max(1, endIndex - startIndex)
          editIndex = startIndex + 1
        } else {
          if (!elementList[index + 1]) return
          draw.spliceElementList(elementList, index + 1, 1)
          deletedCount = 1
          editIndex = index + 1
        }
        curIndex = isCollapsed
          ? tableNavigationService.resolveFragmentTransitionIndex({
              positionContext,
              cursorIndex: index,
              direction: 'next'
            }) ?? index
          : startIndex
      }
    }
  }
  finalizeDeletion({ draw, startIndex, curIndex, deletedCount, editIndex })
}
