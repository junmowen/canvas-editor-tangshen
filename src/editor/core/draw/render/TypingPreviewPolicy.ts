import { ImageDisplay } from '../../../dataset/enum/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { isPatchableTextElement } from '../../modules/paragraph/layout/ParagraphPatchLayoutPolicy'
import { IDocumentChunk } from '../layout/ChunkDataTypes'

/** 判断元素是否适合输入态局部 canvas 预览。 */
export function isTypingPreviewableElement(element: IElement) {
  if (isPatchableTextElement(element)) {
    return true
  }
  return (
    element.type === ElementType.IMAGE &&
    (element.imgDisplay === ImageDisplay.SURROUND ||
      element.imgDisplay === ImageDisplay.TIGHT)
  )
}

/** 判断当前行是否适合输入态局部 canvas 重绘。 */
export function canPreviewTypingRow(elementList: IElement[]) {
  return elementList.every(isTypingPreviewableElement)
}

/** 解析输入预览参与局部测量的元素范围。 */
export function resolveTypingPreviewElementRange(payload: {
  elementCount: number
  startIndex: number
  endIndex: number
}) {
  const endIndex = Math.min(payload.elementCount - 1, payload.endIndex)
  if (payload.startIndex < 0 || endIndex < payload.startIndex) {
    return null
  }
  return {
    startIndex: payload.startIndex,
    endIndex
  }
}

/** 解析预览 chunk 的单页页码；跨页或未知页不能走局部 canvas 预览。 */
export function resolveTypingPreviewChunkPageNo(chunk: IDocumentChunk) {
  if (
    chunk.startPageNo === null ||
    chunk.endPageNo === null ||
    chunk.startPageNo !== chunk.endPageNo
  ) {
    return null
  }
  return chunk.startPageNo
}

/** 判断预览旧行是否能作为局部 canvas 清理和重绘的边界。 */
export function canUseTypingPreviewRows(rowList: IDrawPagePayload['rowList']) {
  return rowList.length > 0 && !rowList.some(row => row.isSurround)
}

/** 判断分栏局部预览是否仍保持旧行数量。 */
export function isTypingPreviewColumnRowCountStable(payload: {
  oldRowList: IDrawPagePayload['rowList']
  rowList: IDrawPagePayload['rowList']
}) {
  return (
    !isColumnLocalPreviewContext(payload.oldRowList) ||
    payload.rowList.length === payload.oldRowList.length
  )
}

/** 判断单行预览测量是否仍停留在当前行内。 */
export function canUseTypingLinePreviewResult(
  rowList: IDrawPagePayload['rowList']
) {
  return rowList.length === 1
}

/** 判断局部预览高度是否没有越过旧绘制区域。 */
export function canFitTypingPreviewHeight(payload: {
  rowList: Array<{ height: number; offsetY?: number }>
  oldRowList: Array<{ height: number; offsetY?: number }>
  nextHeight?: number
}) {
  return (
    payload.rowList.length > 0 &&
    (payload.nextHeight ?? getTypingPreviewRowsHeight(payload.rowList)) <=
      getTypingPreviewRowsHeight(payload.oldRowList)
  )
}

/** 计算一组预览行的占用高度，包含行级 offsetY。 */
export function getTypingPreviewRowsHeight(
  rowList: Array<{ height: number; offsetY?: number }>
) {
  return rowList.reduce((sum, row) => sum + row.height + (row.offsetY || 0), 0)
}

/** 判断局部行是否来自分栏上下文。 */
export function isColumnLocalPreviewContext(
  rowList: IDrawPagePayload['rowList']
) {
  return rowList.some(row => row.columnIndex !== undefined || row.columns)
}

/** 局部测量的行需要继承旧行栏位，position 才不会回退到第一栏。 */
export function applyPreviewRowColumnContext(payload: {
  rowList: IDrawPagePayload['rowList']
  oldRowList: IDrawPagePayload['rowList']
  startY: number
}) {
  payload.rowList.forEach((row, index) => {
    const oldRow =
      payload.oldRowList[Math.min(index, payload.oldRowList.length - 1)]
    row.columnIndex = oldRow?.columnIndex
    row.columns = oldRow?.columns
    if (index === 0) {
      row.columnStartY = payload.startY
    } else if (oldRow?.columnStartY !== undefined) {
      row.columnStartY = oldRow.columnStartY
    }
  })
}
