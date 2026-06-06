import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

type PatchableTextElement = {
  type?: ElementType
  control?: unknown
  controlId?: string
  parentControlId?: string
  controlComponent?: unknown
}

/** 判断元素是否携带控件上下文，控件片段不能当作普通文本做输入态局部 patch。 */
export function hasControlPatchContext(element: PatchableTextElement) {
  return Boolean(
    element.control ||
      element.controlId ||
      element.parentControlId ||
      element.controlComponent
  )
}

/** 判断元素是否适合输入态文本局部 patch / preview。 */
export function isPatchableTextElement(element: PatchableTextElement) {
  if (hasControlPatchContext(element)) {
    return false
  }
  return (
    !element.type ||
    element.type === ElementType.TEXT ||
    element.type === ElementType.HYPERLINK ||
    element.type === ElementType.DATE ||
    element.type === ElementType.SUBSCRIPT ||
    element.type === ElementType.SUPERSCRIPT ||
    element.type === ElementType.TAB
  )
}

/** 判断元素是否会让单段落局部 patch 失去安全边界。 */
export function isUnsafeParagraphPatchElement(element: IElement) {
  return (
    element.type === ElementType.TABLE ||
    element.type === ElementType.IMAGE ||
    element.type === ElementType.LATEX ||
    element.type === ElementType.BLOCK ||
    element.type === ElementType.SEPARATOR ||
    element.type === ElementType.PAGE_BREAK ||
    element.imgDisplay ||
    element.areaId ||
    element.controlId ||
    element.listId
  )
}
