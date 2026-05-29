import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawImagePayload } from '../../../../interface/Draw'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { downloadFile } from '../../../../utils'

/** 创建可插入文档的图片元素。 */
export function createCommandImageElement(
  payload: IDrawImagePayload,
  imageId: string
): IElement {
  return {
    ...payload,
    id: imageId,
    type: ElementType.IMAGE
  }
}

/** 替换当前图片元素资源。 */
export function replaceImageElementValue(
  element: IElement | null,
  value: string
) {
  if (!element || element.type !== ElementType.IMAGE) return false
  element.value = value
  return true
}

/** 保存当前图片元素资源。 */
export function saveImageElement(element: IElement | null) {
  if (!element || element.type !== ElementType.IMAGE) return false
  downloadFile(element.value, `${element.id!}.png`)
  return true
}

function isFloatingImageDisplay(display: ImageDisplay) {
  return (
    display === ImageDisplay.SURROUND ||
    display === ImageDisplay.TIGHT ||
    display === ImageDisplay.FLOAT_TOP ||
    display === ImageDisplay.FLOAT_BOTTOM
  )
}

/** 切换图片显示方式并同步浮动图片初始位置。 */
export function applyImageDisplayChange(payload: {
  /** 图片元素。 */
  element: IElement
  /** 目标显示方式。 */
  display: ImageDisplay
  /** 当前选区起点索引。 */
  startIndex: number
  /** 位置列表。 */
  positionList: IElementPosition[]
}) {
  const { element, display, startIndex, positionList } = payload
  if (element.imgDisplay === display) return false
  element.imgDisplay = display
  if (isFloatingImageDisplay(display)) {
    const {
      pageNo,
      coordinate: { leftTop }
    } = positionList[startIndex]
    element.imgFloatPosition = {
      pageNo,
      x: leftTop[0],
      y: leftTop[1]
    }
  } else {
    delete element.imgFloatPosition
  }
  return true
}
