import { TEXTLIKE_ELEMENT_TYPE } from '../../../../dataset/constant/Element'
import { ElementType } from '../../../../dataset/enum/Element'
import { RowFlex } from '../../../../dataset/enum/Row'
import { IRowElement } from '../../../../interface/Row'

/** 解析 worker 快照中文本绘制颜色。 */
export function resolveWorkerSnapshotTextFillStyle(payload: {
  element: IRowElement
  defaultHyperlinkColor: string
  defaultColor: string
}) {
  const { element, defaultHyperlinkColor, defaultColor } = payload
  return (
    element.color ||
    (element.type === ElementType.HYPERLINK
      ? defaultHyperlinkColor
      : defaultColor)
  )
}

/** 上标 / 下标在 worker 快照中的基线偏移。 */
export function resolveWorkerSnapshotInlineTextOffsetY(element: IRowElement) {
  if (element.type === ElementType.SUPERSCRIPT) {
    return -element.metrics.height / 2
  }
  if (element.type === ElementType.SUBSCRIPT) {
    return element.metrics.height / 2
  }
  return 0
}

/** 判断 worker 快照文本是否需要按独立元素绘制。 */
export function shouldDrawWorkerSnapshotStandaloneText(element: IRowElement) {
  return Boolean(
    element.width ||
      element.letterSpacing ||
      element.rowFlex === RowFlex.ALIGNMENT ||
      element.rowFlex === RowFlex.JUSTIFY ||
      element.type === ElementType.HYPERLINK ||
      element.type === ElementType.SUPERSCRIPT ||
      element.type === ElementType.SUBSCRIPT ||
      element.type === ElementType.LATEX
  )
}

/** 判断是否应用超链接默认下划线。 */
export function shouldUseWorkerSnapshotHyperlinkUnderline(element: IRowElement) {
  return element.type === ElementType.HYPERLINK && element.underline !== false
}

/** 判断当前文本装饰是否需要下标偏移。 */
export function shouldOffsetWorkerSnapshotSubscriptDecoration(
  element: IRowElement
) {
  return element.type === ElementType.SUBSCRIPT
}

/** 判断元素是否可绘制删除线。 */
export function isWorkerSnapshotStrikeoutTextElement(element: IRowElement) {
  return !element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)
}

/** 判断元素类型是否可作为 worker 快照普通文本绘制。 */
export function isWorkerSnapshotTextElement(element: IRowElement) {
  const type = element.type
  return (
    !type ||
    type === ElementType.TEXT ||
    type === ElementType.CONTROL ||
    type === ElementType.TITLE ||
    type === ElementType.HYPERLINK ||
    type === ElementType.DATE ||
    type === ElementType.TAB ||
    type === ElementType.SUPERSCRIPT ||
    type === ElementType.SUBSCRIPT ||
    type === ElementType.LATEX
  )
}
