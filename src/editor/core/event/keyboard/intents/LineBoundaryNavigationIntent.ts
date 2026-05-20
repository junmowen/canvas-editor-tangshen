import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { MoveDirection } from '../../../../dataset/enum/Observer'
import { IElementPosition } from '../../../../interface/Element'
import { CanvasEvent } from '../../CanvasEvent'

function getRowBoundaryPosition(
  positionList: IElementPosition[],
  cursorPosition: IElementPosition,
  isHome: boolean
) {
  const rowPositionList = positionList.filter(
    position =>
      position.pageNo === cursorPosition.pageNo &&
      position.rowNo === cursorPosition.rowNo
  )
  if (!rowPositionList.length) return null
  return isHome ? rowPositionList[0] : rowPositionList[rowPositionList.length - 1]
}

export function runLineBoundaryNavigationIntent(
  evt: KeyboardEvent,
  host: CanvasEvent
) {
  const draw = host.getDraw()
  if (draw.isReadonly()) return
  const components = draw.getComponents()
  const position = components.position
  const cursorPosition = position.getCursorPosition()
  if (!cursorPosition) return

  const isHome = evt.key === KeyMap.Home
  const positionList = position.getPositionList()
  const targetPosition = getRowBoundaryPosition(
    positionList,
    cursorPosition,
    isHome
  )
  if (!targetPosition) return

  const rangeManager = components.range
  let anchorStartIndex = targetPosition.index
  let anchorEndIndex = targetPosition.index
  if (evt.shiftKey) {
    const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
    if (startIndex !== endIndex) {
      if (startIndex === cursorPosition.index) {
        anchorStartIndex = targetPosition.index
        anchorEndIndex = endIndex
      } else {
        anchorStartIndex = startIndex
        anchorEndIndex = targetPosition.index
      }
    } else if (isHome) {
      anchorEndIndex = endIndex
    } else {
      anchorStartIndex = startIndex
    }
  }

  if (anchorStartIndex > anchorEndIndex) {
    ;[anchorStartIndex, anchorEndIndex] = [anchorEndIndex, anchorStartIndex]
  }
  rangeManager.setRange(anchorStartIndex, anchorEndIndex)
  const isCollapsed = anchorStartIndex === anchorEndIndex
  draw.render({
    curIndex: isCollapsed ? targetPosition.index : undefined,
    isSetCursor: isCollapsed,
    isSubmitHistory: false,
    isCompute: false,
    pageRenderScope: 'visible'
  })
  draw.getCursor().moveCursorToVisible({
    cursorPosition: targetPosition,
    direction: isHome ? MoveDirection.UP : MoveDirection.DOWN
  })
  evt.preventDefault()
}
