import { Draw } from '../../../draw/Draw'

export function drawDragCursor(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 拖拽指示颜色，用于绘制拖拽光标或占位线。 */
  dragColor?: string
  /** 拖拽指示宽度，用于绘制拖拽光标或占位线。 */
  dragWidth?: number
}) {
  const { draw, dragColor, dragWidth } = payload
  draw.getComponents().cursor.drawCursor({
    width: dragWidth,
    color: dragColor,
    isBlink: false,
    isFocus: false
  })
}
