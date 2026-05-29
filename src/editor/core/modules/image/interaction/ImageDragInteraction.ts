import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

interface IViewportPoint {
  /** 视口横坐标。 */
  x: number
  /** 视口纵坐标。 */
  y: number
}

/** 判断元素是否为图片类拖拽元素。 */
export function isImageLikeDragElement(element?: IElement | null) {
  return (
    element?.type === ElementType.IMAGE ||
    element?.type === ElementType.LATEX
  )
}

/** 判断元素是否为浮动图片展示模式。 */
export function isFloatingImageElement(element?: IElement | null) {
  return !!(
    element &&
    (element.imgDisplay === ImageDisplay.SURROUND ||
      element.imgDisplay === ImageDisplay.FLOAT_TOP ||
      element.imgDisplay === ImageDisplay.FLOAT_BOTTOM)
  )
}

/** 判断元素是否为环绕图片展示模式。 */
export function isSurroundImageElement(element?: IElement | null) {
  return element?.imgDisplay === ImageDisplay.SURROUND
}

/** 配置禁止浮动图片拖拽时，判断是否应跳过拖拽光标绘制。 */
export function shouldSkipDragCursorForFloatingImage(payload: {
  /** 是否禁用浮动图片拖拽光标。 */
  dragFloatImageDisabled: boolean
  /** 当前拖拽元素。 */
  element?: IElement | null
}) {
  const { dragFloatImageDisabled, element } = payload
  return !!(
    dragFloatImageDisabled &&
    element?.type === ElementType.IMAGE &&
    isFloatingImageElement(element)
  )
}

/** Hover 过程中拖动浮动图片预览。 */
export function dragFloatingImageOnHover(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 当前拖拽元素。 */
  element?: IElement | null
  /** 视口横向增量。 */
  deltaX: number
  /** 视口纵向增量。 */
  deltaY: number
}) {
  const { draw, element, deltaX, deltaY } = payload
  if (element?.type !== ElementType.IMAGE || !isFloatingImageElement(element)) {
    return false
  }
  const components = draw.getComponents()
  components.previewer.clearResizer()
  components.imageParticle.dragFloatImage(deltaX, deltaY)
  return true
}

/** 提交拖拽时同步图片位置，并清理浮动图片预览。 */
export function moveDraggedImagePosition(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 当前拖拽元素。 */
  element: IElement
  /** 当前视口坐标。 */
  viewport: IViewportPoint
  /** 拖拽开始视口坐标。 */
  startViewport?: IViewportPoint
}) {
  const { draw, element, viewport, startViewport } = payload
  const components = draw.getComponents()
  if (isFloatingImageElement(element)) {
    if (!startViewport) {
      components.imageParticle.destroyFloatImage()
      return
    }
    const imgFloatPosition = element.imgFloatPosition!
    element.imgFloatPosition = {
      x: imgFloatPosition.x + viewport.x - startViewport.x,
      y: imgFloatPosition.y + viewport.y - startViewport.y,
      pageNo: draw.getPageNo()
    }
  }
  components.imageParticle.destroyFloatImage()
}

/** 绘制图片 resizer。 */
export function showImageResizer(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 图片元素。 */
  element: IElement
  /** 位置数据。 */
  position?: IElementPosition | null
}) {
  const { draw, element, position } = payload
  draw.getComponents().previewer.drawResizer(element, position || undefined)
}

/** 拖拽提交完成后，重绘图片 resizer。 */
export function repaintDraggedImageResizer(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 图片元素。 */
  element: IElement
  /** 范围结束索引。 */
  rangeEndIndex: number
}) {
  const { draw, element, rangeEndIndex } = payload
  if (isFloatingImageElement(element)) {
    draw.getComponents().previewer.drawResizer(element)
    return
  }
  const dragPosition = draw.getCoordinate().getPositionList()[rangeEndIndex]
  draw.getComponents().previewer.drawResizer(element, dragPosition)
}
