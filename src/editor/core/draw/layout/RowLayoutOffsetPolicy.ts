import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import {
  resolveParagraphOffsetX,
  resolveParagraphRightIndent
} from '../../modules/paragraph/layout/ParagraphRowLayoutPolicy'
import type { Draw } from '../Draw'

/** 行偏移snapshot类型，用于约束内部流程中传递的数据结构。 */
export type IRowOffsetSnapshot = Pick<
  IRow,
  'offsetX' | 'rowFlexOffsetX' | 'rightOffsetX' | 'isList' | 'listIndex'
>

export function applyRowOffset(payload: {
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  isParagraphFirstContentElement: boolean
  /** 列表样式偏移x数值，用于当前布局、统计或索引计算。 */
  listStyleOffsetX: number
  /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
  scale: number
}) {
  const { row, element, isParagraphFirstContentElement, listStyleOffsetX, scale } =
    payload
  if (element.listId) {
    if (!row.offsetX) {
      row.offsetX = listStyleOffsetX
      row.rowFlexOffsetX = listStyleOffsetX
    }
    return
  }
  const paragraphOffsetX = resolveParagraphOffsetX({
    element,
    isParagraphFirstContentElement,
    scale
  })
  const paragraphRightIndent = resolveParagraphRightIndent({ element, scale })
  if (paragraphOffsetX && row.offsetX === undefined) {
    row.offsetX = paragraphOffsetX
  }
  if (
    (paragraphOffsetX || paragraphRightIndent) &&
    row.rowFlexOffsetX === undefined
  ) {
    row.rowFlexOffsetX = paragraphOffsetX
  }
  if (paragraphRightIndent && row.rightOffsetX === undefined) {
    row.rightOffsetX = paragraphRightIndent
  }
}

export function applyWrappedRowOffset(payload: {
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 列表样式偏移x数值，用于当前布局、统计或索引计算。 */
  listStyleOffsetX: number
  /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
  scale: number
}) {
  const { row, element, listStyleOffsetX, scale } = payload
  applyRowOffset({
    row,
    element,
    isParagraphFirstContentElement: false,
    listStyleOffsetX,
    scale
  })
}

export function createRowOffsetSnapshot(row: IRow): IRowOffsetSnapshot {
  return {
    offsetX: row.offsetX,
    rowFlexOffsetX: row.rowFlexOffsetX,
    rightOffsetX: row.rightOffsetX,
    isList: row.isList,
    listIndex: row.listIndex
  }
}

/** 恢复 Row Offset Snapshot 对应的快照状态。 */
export function restoreRowOffsetSnapshot(
  row: IRow,
  snapshot: IRowOffsetSnapshot
) {
  row.offsetX = snapshot.offsetX
  row.rowFlexOffsetX = snapshot.rowFlexOffsetX
  row.rightOffsetX = snapshot.rightOffsetX
  row.isList = snapshot.isList
  row.listIndex = snapshot.listIndex
}

export function getRowAvailableWidth(payload: {
  /** Draw 门面，用于读取分栏测量服务。 */
  draw: Draw
  /** 未扣除行缩进的行内宽度。 */
  innerWidth: number
  /** 当前行。 */
  row: IRow
  /** 当前页码。 */
  pageNo?: number
}) {
  const { draw, innerWidth, row, pageNo = 0 } = payload
  const rowInnerWidth = row.columns
    ? draw
        .getServices()
        .pageColumnLayoutService.getMeasurementColumnWidth(pageNo, row.columns)
    : innerWidth
  return Math.max(0, rowInnerWidth - (row.offsetX || 0) - (row.rightOffsetX || 0))
}
