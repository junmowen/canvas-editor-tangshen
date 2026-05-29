import { ZERO } from '../../../../dataset/constant/Common'
import { IElement } from '../../../../interface/Element'

/** 判断当前元素是否已经抵达段落向前扩展边界。 */
export function isParagraphStartBoundary(
  element?: IElement,
  previousElement?: IElement
) {
  if (!element) return true
  return (
    (element.value === ZERO && !element.listWrap) ||
    element.listId !== previousElement?.listId ||
    element.titleId !== previousElement?.titleId
  )
}

/** 判断当前元素是否已经抵达段落向后扩展边界。 */
export function isParagraphEndBoundary(
  element?: IElement,
  nextElement?: IElement
) {
  if (!element) return true
  return (
    (element.value === ZERO && !element.listWrap) ||
    element.listId !== nextElement?.listId ||
    element.titleId !== nextElement?.titleId
  )
}

/** 折叠光标位于零宽段落起点时，段落范围需要向后补一个位置。 */
export function shouldExtendCollapsedParagraphEnd(payload: {
  /** 是否折叠选区。 */
  isCollapsed: boolean
  /** 段落起点元素。 */
  startElement?: IElement | null
}) {
  return payload.isCollapsed && payload.startElement?.value === ZERO
}
