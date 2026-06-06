import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

/** 判断图片元素在普通排版态下是否可见。 */
export function isVisibleImageElement(element?: IElement | null) {
  return !!(
    element &&
    !element.hide &&
    !element.control?.hide &&
    !element.area?.hide
  )
}

/** 判断元素是否需要加入浮动图片位置缓存。 */
export function shouldCacheFloatImagePosition(element: IElement) {
  return (
    isVisibleImageElement(element) &&
    (element.imgDisplay === ImageDisplay.SURROUND ||
      element.imgDisplay === ImageDisplay.TIGHT ||
      element.imgDisplay === ImageDisplay.FLOAT_TOP ||
      element.imgDisplay === ImageDisplay.FLOAT_BOTTOM)
  )
}

/** 判断元素是否使用图片类垂直偏移。 */
export function shouldUseImageOffset(element: IElement) {
  return (
    isVisibleImageElement(element) &&
    element.imgDisplay !== ImageDisplay.INLINE &&
    element.type === ElementType.IMAGE
  )
}

/** 确保浮动图片具备初始坐标。 */
export function ensureFloatImagePosition(payload: {
  /** 图片元素。 */
  element: IElement
  /** 默认横坐标。 */
  x: number
  /** 默认纵坐标。 */
  y: number
  /** 页码。 */
  pageNo: number
}) {
  const { element, x, y, pageNo } = payload
  if (element.imgFloatPosition) return
  element.imgFloatPosition = {
    x,
    y,
    pageNo
  }
}

/** 获取已缩放的浮动图片矩形。 */
export function resolveScaledFloatImageRect(payload: {
  /** 图片元素。 */
  element: IElement
  /** 当前缩放比例。 */
  scale: number
}) {
  const { element, scale } = payload
  const floatPosition = element.imgFloatPosition
  if (!floatPosition) return null
  return {
    ...floatPosition,
    x: floatPosition.x * scale,
    y: floatPosition.y * scale,
    width: element.width! * scale,
    height: element.height! * scale
  }
}
