import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

export const IMAGE_FRONT_HIT_DISPLAYS = [
  ImageDisplay.FLOAT_TOP,
  ImageDisplay.SURROUND
]

export const IMAGE_BACK_HIT_DISPLAYS = [ImageDisplay.FLOAT_BOTTOM]

/** 获取浮在文字上方的图片命中展示层级。 */
export function getFrontFloatImageHitDisplays() {
  return IMAGE_FRONT_HIT_DISPLAYS
}

/** 获取浮在文字下方的图片命中展示层级。 */
export function getBackFloatImageHitDisplays() {
  return IMAGE_BACK_HIT_DISPLAYS
}

/** 判断元素是否可作为图片类直击目标。 */
export function isImageDirectHitElement(element?: IElement | null) {
  return (
    element?.type === ElementType.IMAGE ||
    element?.type === ElementType.LATEX
  )
}

/** 判断浮动元素是否属于当前命中层级。 */
export function isFloatImageHitCandidate(payload: {
  /** 待判断元素。 */
  element?: IElement | null
  /** 当前命中层级接受的图片展示模式。 */
  imgDisplays: ImageDisplay[]
}) {
  const { element, imgDisplays } = payload
  return !!(
    element?.type === ElementType.IMAGE &&
    element.imgDisplay &&
    imgDisplays.includes(element.imgDisplay)
  )
}

/** 判断页面坐标是否落在浮动图片矩形内。 */
export function isPointInFloatImageElement(payload: {
  /** 图片元素。 */
  element: IElement
  /** 页面横坐标。 */
  x: number
  /** 页面纵坐标。 */
  y: number
  /** 当前缩放比例。 */
  scale: number
}) {
  const { element, x, y, scale } = payload
  if (!element.imgFloatPosition) return false
  const imgFloatPositionX = element.imgFloatPosition.x * scale
  const imgFloatPositionY = element.imgFloatPosition.y * scale
  const elementWidth = element.width! * scale
  const elementHeight = element.height! * scale
  return (
    x >= imgFloatPositionX &&
    x <= imgFloatPositionX + elementWidth &&
    y >= imgFloatPositionY &&
    y <= imgFloatPositionY + elementHeight
  )
}
