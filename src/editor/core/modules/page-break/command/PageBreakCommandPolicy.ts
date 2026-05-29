import { WRAP } from '../../../../dataset/constant/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

/** 创建可插入文档的分页符元素。 */
export function createPageBreakElement(): IElement {
  return {
    type: ElementType.PAGE_BREAK,
    value: WRAP
  }
}
