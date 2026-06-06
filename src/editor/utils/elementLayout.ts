import {
  BLOCK_ELEMENT_TYPE,
  TEXTLIKE_ELEMENT_TYPE
} from '../dataset/constant/Element'
import { ImageDisplay, LocationPosition } from '../dataset/enum/Common'
import { ElementType } from '../dataset/enum/Element'
import { RowFlex } from '../dataset/enum/Row'
import { IElement } from '../interface/Element'

/**
 * 将 DOM 的 text-align 转换为编辑器内部行对齐枚举。
 */
export function convertTextAlignToRowFlex(node: HTMLElement) {
  const textAlign = window.getComputedStyle(node).textAlign
  switch (textAlign) {
    case 'left':
    case 'start':
      return RowFlex.LEFT
    case 'center':
      return RowFlex.CENTER
    case 'right':
    case 'end':
      return RowFlex.RIGHT
    case 'justify':
      return RowFlex.ALIGNMENT
    case 'justify-all':
      return RowFlex.JUSTIFY
    default:
      return RowFlex.LEFT
  }
}

/**
 * 将内部行对齐枚举转换为 DOM text-align。
 */
export function convertRowFlexToTextAlign(rowFlex: RowFlex) {
  return rowFlex === RowFlex.ALIGNMENT ? 'justify' : rowFlex
}

/**
 * 将内部行对齐枚举转换为 flex 布局的 justify-content。
 */
export function convertRowFlexToJustifyContent(rowFlex: RowFlex) {
  switch (rowFlex) {
    case RowFlex.LEFT:
      return 'flex-start'
    case RowFlex.CENTER:
      return 'center'
    case RowFlex.RIGHT:
      return 'flex-end'
    case RowFlex.ALIGNMENT:
    case RowFlex.JUSTIFY:
      return 'space-between'
    default:
      return 'flex-start'
  }
}

/**
 * 判断元素是否按文本类元素参与排版。
 */
export function isTextLikeElement(element: IElement): boolean {
  return !element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)
}

/**
 * 判断元素是否是块级元素；内联表格不按块级处理。
 */
export function getIsBlockElement(element?: IElement) {
  if (
    element?.type === ElementType.TABLE &&
    element.tableDisplay === 'inline'
  ) {
    return false
  }
  return (
    !!element?.type &&
    (BLOCK_ELEMENT_TYPE.includes(element.type) ||
      element.imgDisplay === ImageDisplay.INLINE)
  )
}

/**
 * 用新标签替换 HTMLElement，同时保留属性和内部 HTML。
 */
export function replaceHTMLElementTag(
  oldDom: HTMLElement,
  tagName: keyof HTMLElementTagNameMap
): HTMLElement {
  const newDom = document.createElement(tagName)
  for (let i = 0; i < oldDom.attributes.length; i++) {
    const attr = oldDom.attributes[i]
    newDom.setAttribute(attr.name, attr.value)
  }
  newDom.innerHTML = oldDom.innerHTML
  return newDom
}

/**
 * 提取环绕排版图片元素，供分页布局阶段单独处理。
 */
export function pickSurroundElementList(elementList: IElement[]) {
  const surroundElementList = []
  for (let e = 0; e < elementList.length; e++) {
    const element = elementList[e]
    if (element.hide || element.control?.hide || element.area?.hide) {
      continue
    }
    if (
      element.imgDisplay === ImageDisplay.SURROUND ||
      element.imgDisplay === ImageDisplay.TIGHT
    ) {
      surroundElementList.push(element)
    }
  }
  return surroundElementList
}

/**
 * 删除指定页上的浮动/环绕元素缓存。
 */
export function deleteSurroundElementList(
  elementList: IElement[],
  pageNo: number
) {
  for (let s = elementList.length - 1; s >= 0; s--) {
    const surroundElement = elementList[s]
    if (surroundElement.imgFloatPosition?.pageNo === pageNo) {
      elementList.splice(s, 1)
    }
  }
}

/**
 * 判断浮动环绕矩形是否属于当前栏区域；单栏或无栏区域由调用方跳过。
 */
export function isSurroundRectInColumnRect(
  surroundRect: { x: number; y: number; width: number; height: number },
  columnRect: { x: number; y: number; width: number; height: number }
) {
  const surroundRight = surroundRect.x + surroundRect.width
  const columnRight = columnRect.x + columnRect.width
  return surroundRect.x < columnRight && surroundRight > columnRect.x
}

/**
 * 从指定位置向前或向后寻找未隐藏元素。
 */
export function getNonHideElementIndex(
  elementList: IElement[],
  index: number,
  position: LocationPosition = LocationPosition.BEFORE
) {
  if (
    !elementList[index]?.hide &&
    !elementList[index]?.control?.hide &&
    !elementList[index]?.area?.hide
  ) {
    return index
  }
  let i = index
  if (position === LocationPosition.BEFORE) {
    i = index - 1
    while (i > 0) {
      if (
        !elementList[i]?.hide &&
        !elementList[i]?.control?.hide &&
        !elementList[i]?.area?.hide
      ) {
        return i
      }
      i--
    }
  } else {
    i = index + 1
    while (i < elementList.length) {
      if (
        !elementList[i]?.hide &&
        !elementList[i]?.control?.hide &&
        !elementList[i]?.area?.hide
      ) {
        return i
      }
      i++
    }
  }
  return i
}
