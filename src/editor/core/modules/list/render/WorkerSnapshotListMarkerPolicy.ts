import { ElementType } from '../../../../dataset/enum/Element'
import { IRowElement } from '../../../../interface/Row'

/** 判断元素是否是列表 marker 前用于缩进的 tab。 */
export function isWorkerSnapshotListMarkerTab(element?: IRowElement) {
  return element?.type === ElementType.TAB
}
