import { Draw } from '../../../draw/Draw'

export function drawDragCursor(payload: {
  draw: Draw
  dragColor?: string
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
