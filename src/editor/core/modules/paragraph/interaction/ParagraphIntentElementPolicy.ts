import { ZERO } from '../../../../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../../../../dataset/constant/Element'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

/** 解析词级选择时参与 Intl.Segmenter 的文本值。 */
export function getParagraphWordSegmentValue(element: IElement) {
  return (
    !element.type ||
    (element.type !== ElementType.CONTROL &&
      TEXTLIKE_ELEMENT_TYPE.includes(element.type))
  )
    ? element.value
    : ZERO
}

/** 判断拖拽提交时是否按普通文本元素重建。 */
export function isParagraphPlainTextDragElement(element: IElement) {
  return !element.type || element.type === ElementType.TEXT
}

/** 创建 Tab 插入元素。 */
export function createParagraphTabElement(
  style: Partial<IElement> | null
): IElement {
  return {
    ...style,
    type: ElementType.TAB,
    value: ''
  }
}
