import { MoveDirection } from '../../../../dataset/enum/Observer'
import { IElementPosition } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

export function finalizeVerticalMove(payload: {
  draw: Draw
  anchorStartIndex: number
  anchorEndIndex: number
  positionList: IElementPosition[]
  isUp: boolean
}) {
  const { draw, positionList, isUp } = payload
  let { anchorStartIndex, anchorEndIndex } = payload
  const rangeManager = draw.getComponents().range
  if (!~anchorStartIndex || !~anchorEndIndex) return
  if (anchorStartIndex > anchorEndIndex) {
    [anchorStartIndex, anchorEndIndex] = [anchorEndIndex, anchorStartIndex]
  }
  rangeManager.setRange(anchorStartIndex, anchorEndIndex)
  const isCollapsed = anchorStartIndex === anchorEndIndex
  draw.render({
    curIndex: isCollapsed ? anchorStartIndex : undefined,
    isSetCursor: isCollapsed,
    isSubmitHistory: false,
    isCompute: false,
    pageRenderScope: 'visible'
  })
  draw.getCursor().moveCursorToVisible({
    cursorPosition: positionList[isUp ? anchorStartIndex : anchorEndIndex],
    direction: isUp ? MoveDirection.UP : MoveDirection.DOWN
  })
}
