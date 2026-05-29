import { ZERO } from '../../../../dataset/constant/Common'
import { IElement } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

/** Tab 命中列表段落时，尝试执行列表缩进。 */
export function tryIndentListOnTab(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 当前段落元素列表。 */
  paragraphElementList?: IElement[] | null
  /** 缩进方向。 */
  direction: -1 | 1
}) {
  const { draw, paragraphElementList, direction } = payload
  if (!paragraphElementList?.some(element => element.listId)) return false
  return draw.getListParticle().indentList(direction)
}

/** Enter 位于空列表末尾时，退出当前列表。 */
export function tryUnsetEmptyListOnEnter(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 是否闭合光标。 */
  isCollapsed: boolean
  /** 当前结束元素。 */
  endElement: IElement
  /** 下一个元素。 */
  nextElement?: IElement
}) {
  const { draw, isCollapsed, endElement, nextElement } = payload
  if (
    !isCollapsed ||
    !endElement.listId ||
    endElement.value !== ZERO ||
    nextElement?.listId === endElement.listId
  ) {
    return false
  }
  draw.getListParticle().unsetList()
  return true
}

/** Shift+Enter 位于列表内时，给插入元素补充列表换行标记。 */
export function applyListWrapForShiftEnter(payload: {
  /** 插入元素。 */
  enterText: IElement
  /** 是否按住 Shift。 */
  isShiftKey: boolean
  /** 当前起始元素。 */
  startElement: IElement
}) {
  const { enterText, isShiftKey, startElement } = payload
  if (isShiftKey && startElement.listId) {
    enterText.listWrap = true
  }
}

/** Backspace 位于文档起点空列表项时，退出当前列表。 */
export function tryUnsetListOnBackspaceAtStart(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 文档第一个元素。 */
  firstElement: IElement
}) {
  const { draw, firstElement } = payload
  if (firstElement.value !== ZERO) return false
  if (firstElement.listId) {
    draw.getListParticle().unsetList()
  }
  return true
}
