import { ZERO } from '../../../../dataset/constant/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { RowFlex } from '../../../../dataset/enum/Row'
import { IElement } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'

/** 判断当前元素是否是普通文本元素。 */
export function isPlainTextElement(element: IElement | undefined) {
  return !element?.type || element.type === ElementType.TEXT
}

/** 判断当前零宽段落元素是否需要触发换行。 */
export function shouldBreakAtZeroParagraphElement(element: IElement) {
  return element.value === ZERO && !element.area?.hide
}

/** 判断上一行是否需要按 rowFlex 做均分调整。 */
export function shouldApplyRowFlexSpacing(payload: {
  row: IRow
  preElement: IElement | undefined
}) {
  const { row, preElement } = payload
  return (
    !row.isSurround &&
    (preElement?.rowFlex === RowFlex.JUSTIFY ||
      (preElement?.rowFlex === RowFlex.ALIGNMENT && row.isWidthNotEnough))
  )
}

/** 把段落缩进值归一化为参与布局的非负像素值。 */
export function normalizeParagraphIndent(
  value: number | undefined,
  scale: number
) {
  return Math.max(0, value || 0) * scale
}

/** 计算段落当前行的左侧缩进偏移。 */
export function resolveParagraphOffsetX(payload: {
  element: IElement
  isParagraphFirstContentElement: boolean
  scale: number
}) {
  const { element, isParagraphFirstContentElement, scale } = payload
  if (element.listId) return 0
  const left = normalizeParagraphIndent(element.rowIndentLeft, scale)
  const firstLine = isParagraphFirstContentElement
    ? normalizeParagraphIndent(element.rowIndent, scale)
    : 0
  const hanging = !isParagraphFirstContentElement
    ? normalizeParagraphIndent(element.rowHangingIndent, scale)
    : 0
  return left + firstLine + hanging
}

/** 计算段落右缩进占用的行宽。 */
export function resolveParagraphRightIndent(payload: {
  element: IElement
  scale: number
}) {
  const { element, scale } = payload
  if (element.listId) return 0
  return normalizeParagraphIndent(element.rowIndentRight, scale)
}

/** 计算非环绕行在居中 / 居右模式下的横向偏移。 */
export function resolveRowFlexOffsetX(payload: {
  row: IRow
  innerWidth: number
}) {
  const { row, innerWidth } = payload
  if (row.isSurround) return 0
  const rowWidth =
    row.width + (row.rowFlexOffsetX || 0) + (row.rightOffsetX || 0)
  if (row.rowFlex === RowFlex.CENTER) {
    return (innerWidth - rowWidth) / 2
  }
  if (row.rowFlex === RowFlex.RIGHT) {
    return innerWidth - rowWidth
  }
  return 0
}
