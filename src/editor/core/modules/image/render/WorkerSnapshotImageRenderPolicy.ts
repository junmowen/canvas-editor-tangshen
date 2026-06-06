import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import { IFloatPosition } from '../../../../interface/Position'
import { ITableFragmentDescriptor } from '../../../../interface/table/TableFragment'
import { isVisibleImageElement } from '../position/ImagePositionPolicy'

export type TWorkerSnapshotImageLayer = ImageDisplay

/** worker 快照中位于文字下层的浮动图片展示模式。 */
export function getWorkerSnapshotBottomFloatImageLayerList() {
  return [ImageDisplay.FLOAT_BOTTOM]
}

/** worker 快照中位于文字上层的浮动图片展示模式。 */
export function getWorkerSnapshotTopFloatImageLayerList() {
  return [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND, ImageDisplay.TIGHT]
}

/** 判断元素是否是 worker 快照支持的浮动图片。 */
export function isWorkerSnapshotFloatingImage(element: IElement) {
  return Boolean(
    element.type === ElementType.IMAGE &&
      isVisibleImageElement(element) &&
      (element.imgDisplay === ImageDisplay.SURROUND ||
        element.imgDisplay === ImageDisplay.TIGHT ||
        element.imgDisplay === ImageDisplay.FLOAT_TOP ||
        element.imgDisplay === ImageDisplay.FLOAT_BOTTOM)
  )
}

/** 判断 worker 快照是否支持该浮动图片。 */
export function isWorkerSnapshotSupportedFloatingImage(payload: {
  element: IElement
  tableFragment?: ITableFragmentDescriptor
}) {
  const { element, tableFragment } = payload
  return !tableFragment && isVisibleImageElement(element) && !!element.imgFloatPosition
}

/** 判断浮动图片渲染是否必须与环绕避让盒保持一致。 */
function shouldRenderByExplicitFloatPosition(element: IElement) {
  return (
    element.imgDisplay === ImageDisplay.SURROUND ||
    element.imgDisplay === ImageDisplay.TIGHT
  )
}

/** 解析浮动图片在当前布局缓存中的绘制坐标。 */
export function resolveFloatingImageRenderPosition(payload: {
  floatPosition: IFloatPosition
  scale: number
}) {
  const { floatPosition, scale } = payload
  const {
    position,
    element: { imgFloatPosition }
  } = floatPosition
  if (
    imgFloatPosition &&
    shouldRenderByExplicitFloatPosition(floatPosition.element)
  ) {
    return {
      x: imgFloatPosition.x * scale,
      y: imgFloatPosition.y * scale
    }
  }
  const leftTop = position?.coordinate?.leftTop
  const positionX = leftTop?.[0]
  const positionY = leftTop?.[1]
  const x =
    positionX !== undefined
      ? positionX
      : imgFloatPosition?.x !== undefined
        ? imgFloatPosition.x * scale
        : undefined
  const y =
    positionY !== undefined
      ? positionY
      : imgFloatPosition?.y !== undefined
        ? imgFloatPosition.y * scale
        : undefined
  if (x === undefined || y === undefined) {
    return null
  }
  return {
    x,
    y
  }
}

/** 解析 worker 快照浮动图片绘制矩形。 */
export function resolveWorkerSnapshotFloatingImageRect(payload: {
  pageNo: number
  floatPosition: IFloatPosition
  imageLayerList: TWorkerSnapshotImageLayer[]
  scale: number
}) {
  const { pageNo, floatPosition, imageLayerList, scale } = payload
  const { element } = floatPosition
  if (
    pageNo !== floatPosition.pageNo ||
    element.type !== ElementType.IMAGE ||
    !isVisibleImageElement(element) ||
    !element.imgDisplay ||
    !imageLayerList.includes(element.imgDisplay) ||
    !element.imgFloatPosition
  ) {
    return null
  }
  const renderPosition = resolveFloatingImageRenderPosition({
    floatPosition,
    scale
  })
  if (!renderPosition) {
    return null
  }
  return {
    x: renderPosition.x,
    y: renderPosition.y,
    width: element.width! * scale,
    height: element.height! * scale
  }
}
