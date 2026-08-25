import {
  handleBackspaceControlDeletion
} from '../../../modules/control/interaction/handleControlDeletion'
import { isRangeControlDeletionDisabled } from '../../../modules/control/policy/ControlDeletionPolicy'
import { applyTableToolState } from '../../../modules/table/interaction/applyTableToolState'
import { resolveTableBackspaceAtStart } from '../../../modules/table/navigation/resolveTableBackspaceAtStart'
import { clearCrossRowColSelection } from '../../../modules/table/selection/clearCrossRowColSelection'
import { tryUnsetListOnBackspaceAtStart } from '../../../modules/list/interaction/ListKeyboardInteraction'
import { inheritRowFlexOnCollapsedZeroBackspace } from '../../../modules/paragraph/interaction/ParagraphBackspaceInteraction'
import { CanvasEvent } from '../../CanvasEvent'
import { finalizeCollapsedCursorMove } from '../shared/finalizeCollapsedCursorMove'
import { finalizeDeletion } from '../shared/finalizeDeletion'
import { removeHiddenElements } from '../shared/removeHiddenElements'

export function runBackspaceIntent(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  if (draw.isReadonly()) return
  const rangeManager = components.range
  if (!rangeManager.getIsCanInput()) return
  if (rangeManager.getIsCollapsed()) {
    removeHiddenElements(host, 'prev')
  }
  const control = components.control
  const { startIndex, endIndex, isCrossRowCol } =
    rangeManager.getEditBoundaryRange()
  let curIndex: number | null
  let deletedCount = 1
  let editIndex = startIndex
  let mutationCount = 0
  if (isCrossRowCol) {
    curIndex = clearCrossRowColSelection(draw)
    if (curIndex === null) return
    mutationCount++
    deletedCount = Math.max(1, endIndex - startIndex)
    editIndex = startIndex + 1
  } else {
    if (
      isRangeControlDeletionDisabled(control, {
        range: rangeManager.getEditBoundaryRange()
      })
    ) {
      evt.preventDefault()
      return
    }
    curIndex = handleBackspaceControlDeletion(control, evt)
    if (curIndex !== null) {
      mutationCount++
    }
    if (curIndex === null) {
      const cursorPosition = draw.getCoordinate().getCursorPosition()
      if (!cursorPosition) return
      const { index } = cursorPosition
      const isCollapsed = rangeManager.getIsCollapsed()
      const elementList = draw.getObjectResolver().getElementList()
      if (isCollapsed && index === 0) {
        const firstElement = elementList[index]
        const positionContext = draw.getCoordinate().getPositionContext()
        const tableBackspace = resolveTableBackspaceAtStart({
          draw,
          firstElement,
          positionContext
        })
        if (tableBackspace) {
          if (tableBackspace.shouldRemoveFirstElement) {
            mutationCount += draw.spliceElementList(elementList, 0, 1)
          }
          draw.getCoordinate().setPositionContext(
            tableBackspace.nextPositionContext
          )
          finalizeCollapsedCursorMove({
            draw,
            curIndex: tableBackspace.nextIndex
          })
          applyTableToolState(draw, false)
          evt.preventDefault()
          return
        }
        if (tryUnsetListOnBackspaceAtStart({ draw, firstElement })) {
          evt.preventDefault()
          return
        }
      }
      const startElement = elementList[startIndex]
      inheritRowFlexOnCollapsedZeroBackspace({
        isCollapsed,
        startElement,
        elementList,
        startIndex,
        rowElementList: rangeManager.getRangeRowElementList()
      })
      if (!isCollapsed) {
        mutationCount += draw.spliceElementList(
          elementList,
          startIndex + 1,
          endIndex - startIndex
        )
        deletedCount = Math.max(1, endIndex - startIndex)
        editIndex = startIndex + 1
      } else {
        mutationCount += draw.spliceElementList(elementList, index, 1)
        deletedCount = 1
        editIndex = index
      }
      curIndex = isCollapsed ? index - 1 : startIndex
    }
  }
  if (draw.getTrackChange().isEnabled() && mutationCount === 0) {
    evt.preventDefault()
    return
  }
  finalizeDeletion({ draw, startIndex, curIndex, deletedCount, editIndex })
}
