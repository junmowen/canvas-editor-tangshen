import { ZERO } from '../../../../dataset/constant/Common'
import { ElementType, ListStyle } from '../../../..'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { ICurrentPosition } from '../../../../interface/Position'

function isListCheckboxTabElement(element?: IElement | null) {
  return (
    element?.type === ElementType.TAB &&
    element.listStyle === ListStyle.CHECKBOX
  )
}

function isListCheckboxStartElement(element?: IElement | null) {
  return element?.listStyle === ListStyle.CHECKBOX
}

/** 解析 checkbox 列表符号命中到的零宽列表起点。 */
export function resolveListCheckboxTabHit(payload: {
  /** 当前命中的元素。 */
  element: IElement
  /** 当前元素游标。 */
  cursor: number
  /** 元素列表。 */
  elementList: IElement[]
  /** 位置列表。 */
  positionList: IElementPosition[]
}): ICurrentPosition | null {
  const { element, cursor, elementList, positionList } = payload
  if (!isListCheckboxTabElement(element)) return null

  let searchCursor = cursor - 1
  while (searchCursor > 0) {
    const searchElement = elementList[searchCursor]
    if (!searchElement) {
      searchCursor--
      continue
    }
    if (
      searchElement.value === ZERO &&
      searchElement.listStyle === ListStyle.CHECKBOX
    ) {
      break
    }
    searchCursor--
  }
  const index = positionList[searchCursor]?.index ?? searchCursor
  return {
    index,
    hitTargetIndex: index,
    isDirectHit: true,
    isCheckbox: true
  }
}

/** checkbox 列表行首从页面左边距开始响应。 */
export function resolveListCheckboxHeadStartX(payload: {
  /** 行首元素。 */
  headElement: IElement
  /** 默认行首 X 坐标。 */
  defaultStartX: number
  /** 页面左边距。 */
  leftMargin: number
}) {
  const { headElement, defaultStartX, leftMargin } = payload
  return isListCheckboxStartElement(headElement) ? leftMargin : defaultStartX
}

/** 解析 checkbox 列表行首符号区域命中。 */
export function resolveListCheckboxHeadHit(payload: {
  /** 行首元素。 */
  headElement: IElement
  /** 行首位置。 */
  headPosition: IElementPosition
  /** 指针横坐标。 */
  x: number
}): ICurrentPosition | null {
  const { headElement, headPosition, x } = payload
  if (
    !isListCheckboxStartElement(headElement) ||
    x >= headPosition.coordinate.leftTop[0]
  ) {
    return null
  }
  return {
    index: headPosition.index,
    isDirectHit: true,
    isCheckbox: true
  }
}
