import { EDITOR_ELEMENT_STYLE_ATTR } from '../../dataset/constant/Element'
import { IDrawOption } from '../../interface/Draw'
import { IElement, IElementStyle, ITabStop } from '../../interface/Element'
import type { Draw } from '../draw/Draw'
import type { RangeManager } from '../range/RangeManager'
import { normalizeTabStops } from './CommandParagraphStylePolicy'

/** 从选区中采集格式刷样式。 */
export function collectPainterStyleFromSelection(
  selection: IElement[]
): IElementStyle {
  const painterStyle: Partial<IElement> = {}
  selection.forEach(element => {
    EDITOR_ELEMENT_STYLE_ATTR.forEach(attr => {
      if (painterStyle[attr] === undefined) {
        Reflect.set(painterStyle, attr, Reflect.get(element, attr))
      }
    })
  })
  return painterStyle as IElementStyle
}

/** 清除元素上的可继承富文本样式。 */
export function clearRichTextStyleFromElementList(elementList: IElement[]) {
  elementList.forEach(element => {
    EDITOR_ELEMENT_STYLE_ATTR.forEach(attr => {
      delete element[attr]
    })
  })
}

/** 应用或清除段落制表位。 */
export function applyTabStopsToParagraphList(
  paragraphElementList: IElement[],
  payload: ITabStop[] | null
) {
  const nextTabStops = normalizeTabStops(payload)
  paragraphElementList.forEach(element => {
    if (nextTabStops.length) {
      element.tabStops = nextTabStops.map(tabStop => ({ ...tabStop }))
    } else {
      delete element.tabStops
    }
  })
}

/** 生成段落类命令渲染后的光标定位参数。 */
export function createParagraphCommandRenderOption(
  startIndex: number,
  endIndex: number
): IDrawOption {
  const isSetCursor = startIndex === endIndex
  const curIndex = isSetCursor ? endIndex : startIndex
  return { curIndex, isSetCursor }
}

/** 获取当前段落命令应作用的元素列表。 */
export function getCommandParagraphElementList(range: RangeManager) {
  return range.getEditBoundaryRange().isCrossRowCol
    ? range.getSelectionElementList()
    : range.getRangeParagraphElementList()
}

/** 执行段落元素命令的通用只读、选区和渲染流程。 */
export function executeParagraphElementCommand(payload: {
  draw: Draw
  range: RangeManager
  getRange: () => {
    startIndex: number
    endIndex: number
  }
  getElementList?: () => IElement[] | null
  apply: (paragraphElementList: IElement[]) => boolean | void
}) {
  if (payload.draw.isReadonly()) return
  const { startIndex, endIndex } = payload.getRange()
  if (!~startIndex && !~endIndex) return
  const paragraphElementList = payload.getElementList
    ? payload.getElementList()
    : getCommandParagraphElementList(payload.range)
  if (!paragraphElementList) return
  const result = payload.apply(paragraphElementList)
  if (result === false) return
  payload.draw.render(createParagraphCommandRenderOption(startIndex, endIndex))
}
