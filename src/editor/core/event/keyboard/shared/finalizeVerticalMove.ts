import { MoveDirection } from '../../../../dataset/enum/Observer'
import { IElementPosition } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

export function finalizeVerticalMove(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 锚点起始索引，用于还原选区拖拽前的左边界。 */
  anchorStartIndex: number
  /** 锚点结束索引，用于还原选区拖拽前的右边界。 */
  anchorEndIndex: number
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
  /** 是否向上移动，用于控制垂直导航方向。 */
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
