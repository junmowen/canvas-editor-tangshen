import { ZERO } from '../../../dataset/constant/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'

/** 创建普通文本元素，作为 w:t 和普通 w:br 的内部表示。 */
export function createOoxmlTextElement(value: string): IElement {
  return {
    value
  }
}

/** 创建制表符元素，保持与现有导出约定 ElementType.TAB + value:'' 一致。 */
export function createOoxmlTabElement(): IElement {
  return {
    type: ElementType.TAB,
    value: ''
  }
}

/** 创建分页符元素，用于承接 w:br w:type="page" 的 Word 原生分页。 */
export function createOoxmlPageBreakElement(): IElement {
  return {
    type: ElementType.PAGE_BREAK,
    value: ''
  }
}

/** 把段落结束符追加到元素列表末尾，使用导出侧已有 ZERO 段落约定。 */
export function appendOoxmlParagraphEnd(elementList: IElement[]) {
  const lastElement = elementList[elementList.length - 1]
  if (lastElement && !lastElement.type) {
    lastElement.value += ZERO
    return
  }
  elementList.push(createOoxmlTextElement(ZERO))
}
