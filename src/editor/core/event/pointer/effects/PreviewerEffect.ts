import { ImageDisplay } from '../../../../dataset/enum/Common'
import { IElementPosition } from '../../../../interface/Element'
import { IPreviewerDrawOption } from '../../../../interface/Previewer'
import { Draw } from '../../../draw/Draw'

export function clearPreviewerResizer(draw: Draw) {
  draw.getComponents().previewer.clearResizer()
}

export function showImageResizer(payload: {
  draw: Draw
  element: any
  position?: IElementPosition | null
  options?: IPreviewerDrawOption
}) {
  const { draw, element, position, options } = payload
  draw.getComponents().previewer.drawResizer(element, position || undefined, options)
}

export function hideCursorForPreviewer(draw: Draw) {
  draw.getCursor().drawCursor({ isShow: false })
}

export function repaintDraggedImageResizer(payload: {
  draw: Draw
  element: any
  rangeEndIndex: number
}) {
  const { draw, element, rangeEndIndex } = payload
  if (
    element.imgDisplay === ImageDisplay.SURROUND ||
    element.imgDisplay === ImageDisplay.FLOAT_TOP ||
    element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
  ) {
    draw.getComponents().previewer.drawResizer(element)
  } else {
    const dragPositionList = draw.getComponents().position.getPositionList()
    const dragPosition = dragPositionList[rangeEndIndex]
    draw.getComponents().previewer.drawResizer(element, dragPosition)
  }
}
