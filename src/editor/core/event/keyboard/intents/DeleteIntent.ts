import {
  handleDeleteControlDeletion,
  removeNextControlForDelete
} from '../../../modules/control/interaction/handleControlDeletion'
import { isRangeControlDeletionDisabled } from '../../../modules/control/policy/ControlDeletionPolicy'
import { resolveTableDeleteFragmentTransition } from '../../../modules/table/navigation/resolveTableDeleteFragmentTransition'
import { clearCrossRowColSelection } from '../../../modules/table/selection/clearCrossRowColSelection'
import { CanvasEvent } from '../../CanvasEvent'
import { finalizeDeletion } from '../shared/finalizeDeletion'
import { removeHiddenElements } from '../shared/removeHiddenElements'

export function runDeleteIntent(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  if (draw.isReadonly()) return
  const rangeManager = components.range
  if (!rangeManager.getIsCanInput()) return
  const { startIndex, endIndex, isCrossRowCol } =
    rangeManager.getEditBoundaryRange()
  const elementList = draw.getObjectResolver().getElementList()
  const control = components.control
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
      isRangeControlDeletionDisabled(control, {
        range: rangeManager.getEditBoundaryRange(),
        elementList
      })
    ) {
      evt.preventDefault()
      return
    }
    curIndex = handleDeleteControlDeletion(control, evt)
    if (curIndex === null) {
      curIndex = removeNextControlForDelete({
        control,
        elementList,
        endIndex
      })
    }
    if (curIndex !== null) {
      deletedCount = 1
      editIndex = endIndex + 1
    }
    if (curIndex === null) {
      const coordinate = draw.getCoordinate()
      const cursorPosition = coordinate.getCursorPosition()
      if (!cursorPosition) return
      const { index } = cursorPosition
      const positionContext = coordinate.getPositionContext()
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
          ? resolveTableDeleteFragmentTransition({
              draw,
              positionContext,
              cursorIndex: index
            })
          : startIndex
      }
    }
  }
  finalizeDeletion({ draw, startIndex, curIndex, deletedCount, editIndex })
}
