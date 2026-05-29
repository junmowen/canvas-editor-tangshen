import { ZERO } from '../dataset/constant/Common'
import {
  AREA_CONTEXT_ATTR,
  EDITOR_ROW_ATTR,
  LIST_CONTEXT_ATTR,
  TABLE_CONTEXT_ATTR,
  TITLE_CONTEXT_ATTR
} from '../dataset/constant/Element'
import { START_LINE_BREAK_REG } from '../dataset/constant/Regular'
import { EditorMode } from '../dataset/enum/Editor'
import { ElementType } from '../dataset/enum/Element'
import { DeepRequired } from '../interface/Common'
import { IEditorOption } from '../interface/Editor'
import { IElement } from '../interface/Element'
import { cloneProperty, omitObject } from '.'
import { getIsBlockElement } from './elementLayout'

/**
 * 获取用于继承上下文的锚点元素。
 *
 * 当锚点是段首换行符且下一个元素仍在同一区域时，使用下一个元素作为样式和上下文来源。
 */
export function getAnchorElement(
  elementList: IElement[],
  anchorIndex: number
): IElement | null {
  const anchorElement = elementList[anchorIndex]
  if (!anchorElement) return null
  const anchorNextElement = elementList[anchorIndex + 1]
  return !anchorElement.listId &&
    anchorElement.value === ZERO &&
    anchorNextElement &&
    anchorNextElement.value !== ZERO &&
    anchorElement.areaId === anchorNextElement.areaId
    ? anchorNextElement
    : anchorElement
}

/** format元素上下文选项，用于约束调用方可传入的可选配置。 */
export interface IFormatElementContextOption {
  /** 是否在换行时强制断开，用于控制行布局边界。 */
  isBreakWhenWrap?: boolean
  /** 编辑器配置项，用于读取全局排版和交互规则。 */
  editorOptions?: DeepRequired<IEditorOption>
}

/**
 * 将锚点元素的表格、标题、列表、区域和行属性补偿到待插入元素。
 *
 * 这是插入/粘贴路径的核心上下文继承逻辑：跨换行或列表边界时只保留安全的表格/行/区域属性；
 * 普通文本继续继承段落相关属性，块级元素则不继承行级样式。
 */
export function formatElementContext(
  sourceElementList: IElement[],
  formatElementList: IElement[],
  anchorIndex: number,
  options?: IFormatElementContextOption
) {
  let copyElement = getAnchorElement(sourceElementList, anchorIndex)
  if (!copyElement) return
  const { isBreakWhenWrap = false, editorOptions } = options || {}
  const { mode } = editorOptions || {}
  if (mode !== EditorMode.DESIGN && copyElement.title?.disabled) {
    copyElement = omitObject(copyElement, TITLE_CONTEXT_ATTR)
  }
  let isBreakWarped = false
  for (let e = 0; e < formatElementList.length; e++) {
    const targetElement = formatElementList[e]
    if (
      isBreakWhenWrap &&
      !copyElement.listId &&
      START_LINE_BREAK_REG.test(targetElement.value)
    ) {
      isBreakWarped = true
    }
    if (
      isBreakWarped ||
      (!copyElement.listId && targetElement.type === ElementType.LIST)
    ) {
      // 初始化 clone Attr 列表。
      const cloneAttr = [
        ...TABLE_CONTEXT_ATTR,
        ...EDITOR_ROW_ATTR,
        ...AREA_CONTEXT_ATTR.filter(attr => targetElement[attr] === undefined)
      ]
      cloneProperty<IElement>(cloneAttr, copyElement, targetElement)
      targetElement.valueList?.forEach(valueItem => {
        // 初始化 value Clone Attr 列表。
        const valueCloneAttr = [
          ...TABLE_CONTEXT_ATTR,
          ...EDITOR_ROW_ATTR,
          ...AREA_CONTEXT_ATTR.filter(attr => valueItem[attr] === undefined)
        ]
        cloneProperty<IElement>(valueCloneAttr, copyElement!, valueItem)
      })
      continue
    }
    if (
      targetElement.valueList?.length &&
      targetElement.type !== ElementType.AREA
    ) {
      formatElementContext(
        sourceElementList,
        targetElement.valueList,
        anchorIndex,
        options
      )
    }
    // 初始化 clone Attr 列表。
    const cloneAttr = [
      ...TABLE_CONTEXT_ATTR,
      ...TITLE_CONTEXT_ATTR.filter(attr => targetElement[attr] === undefined),
      ...LIST_CONTEXT_ATTR,
      ...AREA_CONTEXT_ATTR.filter(attr => targetElement[attr] === undefined)
    ]
    if (!getIsBlockElement(targetElement)) {
      cloneAttr.push(
        ...EDITOR_ROW_ATTR.filter(attr => targetElement[attr] === undefined)
      )
    }
    cloneProperty<IElement>(cloneAttr, copyElement, targetElement)
  }
}
