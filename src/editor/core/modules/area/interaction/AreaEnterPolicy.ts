import { AREA_CONTEXT_ATTR } from '../../../../dataset/constant/Element'
import { IElement } from '../../../../interface/Element'
import { omitObject } from '../../../../utils'

/** Shift+Enter 跨出区域时，清理插入元素的区域上下文。 */
export function normalizeAreaContextForEnter(payload: {
  /** 插入元素。 */
  enterText: IElement
  /** 是否按住 Shift。 */
  isShiftKey: boolean
  /** 当前结束元素。 */
  endElement: IElement
  /** 下一个元素。 */
  nextElement?: IElement
}) {
  const { enterText, isShiftKey, endElement, nextElement } = payload
  if (
    isShiftKey &&
    endElement.areaId &&
    endElement.areaId !== nextElement?.areaId
  ) {
    return omitObject(enterText, AREA_CONTEXT_ATTR)
  }
  return enterText
}
