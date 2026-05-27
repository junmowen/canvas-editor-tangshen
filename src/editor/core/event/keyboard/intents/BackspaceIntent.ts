import { ZERO } from '../../../../dataset/constant/Common'
import { CanvasEvent } from '../../CanvasEvent'
import { applyTableToolState } from '../shared/applyTableToolState'
import { clearCrossRowColSelection } from '../shared/clearCrossRowColSelection'
import { finalizeCollapsedCursorMove } from '../shared/finalizeCollapsedCursorMove'
import { finalizeDeletion } from '../shared/finalizeDeletion'
import { handleControlDeletion } from '../shared/handleControlDeletion'
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
  const tableNavigationService = components.tableNavigationService
  const { startIndex, endIndex, isCrossRowCol } =
    rangeManager.getEditBoundaryRange()
  let curIndex: number | null
  let deletedCount = 1
  let editIndex = startIndex
  if (isCrossRowCol) {
    curIndex = clearCrossRowColSelection(draw)
    if (curIndex === null) return
    deletedCount = Math.max(1, endIndex - startIndex)
    editIndex = startIndex + 1
  } else {
    if (
      control.getIsRangeControlDeletionDisabled({
        range: rangeManager.getEditBoundaryRange()
      })
    ) {
      evt.preventDefault()
      return
    }
    curIndex = handleControlDeletion(control, evt, () =>
      !!(control.getActiveControl() && control.getIsRangeCanCaptureEvent())
    )
    if (curIndex === null) {
      const cursorPosition = draw.getCoordinate().getCursorPosition()
      if (!cursorPosition) return
      const { index } = cursorPosition
      const isCollapsed = rangeManager.getIsCollapsed()
      const elementList = draw.getObjectResolver().getElementList()
      if (isCollapsed && index === 0) {
        const firstElement = elementList[index]
        const positionContext = draw.getCoordinate().getPositionContext()
        if (positionContext.isTable && firstElement.tableId) {
          const navigationResult = tableNavigationService.resolveBackspaceNavigation({
            positionContext
          })
          if (navigationResult) {
            if (firstElement.value !== ZERO) {
              draw.spliceElementList(elementList, 0, 1)
            }
            draw.getCoordinate().setPositionContext(
              navigationResult.nextPositionContext
            )
            finalizeCollapsedCursorMove({
              draw,
              curIndex: navigationResult.nextIndex
            })
            applyTableToolState(draw, false)
            evt.preventDefault()
            return
          }
        }
        if (firstElement.value === ZERO) {
          if (firstElement.listId) {
            draw.getListParticle().unsetList()
          }
          evt.preventDefault()
          return
        }
      }
      const startElement = elementList[startIndex]
      if (isCollapsed && startElement.rowFlex && startElement.value === ZERO) {
        const rowFlexElementList = rangeManager.getRangeRowElementList()
        if (rowFlexElementList) {
          const preElement = elementList[startIndex - 1]
          rowFlexElementList.forEach(element => {
            element.rowFlex = preElement?.rowFlex
          })
        }
      }
      if (!isCollapsed) {
        draw.spliceElementList(
          elementList,
          startIndex + 1,
          endIndex - startIndex
        )
        deletedCount = Math.max(1, endIndex - startIndex)
        editIndex = startIndex + 1
      } else {
        draw.spliceElementList(elementList, index, 1)
        deletedCount = 1
        editIndex = index
      }
      curIndex = isCollapsed ? index - 1 : startIndex
    }
  }
  finalizeDeletion({ draw, startIndex, curIndex, deletedCount, editIndex })
}
