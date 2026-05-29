import { ImageDisplay } from '../../../../dataset/enum/Common'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import { IFloatPosition } from '../../../../interface/Position'
import { ITableFragmentDescriptor } from '../../../../interface/table/TableFragment'

export type TWorkerSnapshotImageLayer = ImageDisplay

/** worker 快照中位于文字下层的浮动图片展示模式。 */
export function getWorkerSnapshotBottomFloatImageLayerList() {
  return [ImageDisplay.FLOAT_BOTTOM]
}

/** worker 快照中位于文字上层的浮动图片展示模式。 */
export function getWorkerSnapshotTopFloatImageLayerList() {
  return [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND]
}

/** 判断元素是否是 worker 快照支持的浮动图片。 */
export function isWorkerSnapshotFloatingImage(element: IElement) {
  return Boolean(
    element.type === ElementType.IMAGE &&
      (element.imgDisplay === ImageDisplay.SURROUND ||
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
  return !tableFragment && !!element.imgFloatPosition
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
    !(
      pageNo === floatPosition.pageNo ||
      floatPosition.zone === EditorZone.HEADER ||
      floatPosition.zone === EditorZone.FOOTER
    ) ||
    element.type !== ElementType.IMAGE ||
    !element.imgDisplay ||
    !imageLayerList.includes(element.imgDisplay) ||
    !element.imgFloatPosition
  ) {
    return null
  }
  return {
    x: element.imgFloatPosition.x * scale,
    y: element.imgFloatPosition.y * scale,
    width: element.width! * scale,
    height: element.height! * scale
  }
}
