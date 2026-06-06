import { ZERO } from '../../../dataset/constant/Common'
import { IDrawLayoutPatch } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { isUnsafeParagraphPatchElement } from '../../modules/paragraph/layout/ParagraphPatchLayoutPolicy'
import { hasTableElementInRow } from '../../modules/table/layout/TableRowLayoutPolicy'

export interface IDrawLayoutParagraphRange {
  start: number
  end: number
}

export interface IDrawLayoutRowRange {
  startIndex: number
  endIndex: number
  rows: IRow[]
}

/** 判断本次 layout patch 是否满足文本输入局部计算的基础入口条件。 */
export function canStartTextInputLayoutPatch(payload: {
  layoutPatch: IDrawLayoutPatch
  isMainActive: boolean
  isPagingMode: boolean
  mainElementList: IElement[]
  oldRowList: IRow[]
  oldPageRowList: IRow[][]
}) {
  const {
    layoutPatch,
    isMainActive,
    isPagingMode,
    mainElementList,
    oldRowList,
    oldPageRowList
  } = payload
  return (
    layoutPatch.type === 'text-input' &&
    isMainActive &&
    isPagingMode &&
    mainElementList.length > 0 &&
    oldRowList.length > 0 &&
    oldPageRowList.length > 0 &&
    layoutPatch.insertCount === 1
  )
}

/** 判断旧行是否可作为局部 patch 的锚点。 */
export function canUseTextInputPatchAnchor(payload: {
  layoutPatch: IDrawLayoutPatch
  oldRowList: IRow[]
  oldPageRowList: IRow[][]
}) {
  const { layoutPatch, oldRowList, oldPageRowList } = payload
  const patchRow = oldRowList[layoutPatch.rowIndex]
  const oldPatchPageRows = oldPageRowList[layoutPatch.pageNo]
  return Boolean(
    patchRow &&
      oldPatchPageRows &&
      !hasTableElementInRow(patchRow)
  )
}

/** 解析文本输入所在段落的局部 patch 范围。 */
export function resolveTextInputPatchParagraphRange(
  elementList: IElement[],
  index: number
): IDrawLayoutParagraphRange | null {
  if (!elementList[index]) {
    return null
  }
  let start = index
  while (start > 0) {
    const element = elementList[start]
    const preElement = elementList[start - 1]
    if (
      (element.value === ZERO && !element.listWrap) ||
      element.listId !== preElement?.listId ||
      element.titleId !== preElement?.titleId
    ) {
      break
    }
    start--
  }
  let end = index
  while (end < elementList.length - 1) {
    const element = elementList[end]
    const nextElement = elementList[end + 1]
    if (
      (element.value === ZERO && !element.listWrap) ||
      element.listId !== nextElement?.listId ||
      element.titleId !== nextElement?.titleId
    ) {
      break
    }
    end++
  }
  return { start, end }
}

/** 判断段落范围内是否存在会破坏局部 patch 安全边界的元素。 */
export function hasUnsafeTextInputPatchElement(payload: {
  elementList: IElement[]
  range: IDrawLayoutParagraphRange
}) {
  for (let index = payload.range.start; index <= payload.range.end; index++) {
    const element = payload.elementList[index]
    if (isUnsafeParagraphPatchElement(element)) {
      return true
    }
  }
  return false
}

/** 解析文本输入段落在旧行列表中的可替换行窗口。 */
export function resolveTextInputPatchRowRange(payload: {
  oldRowList: IRow[]
  paragraphRange: IDrawLayoutParagraphRange
}): IDrawLayoutRowRange | null {
  const { oldRowList, paragraphRange } = payload
  const patchRowStartIndex = oldRowList.findIndex(
    row => row.startIndex >= paragraphRange.start
  )
  if (!~patchRowStartIndex) {
    return null
  }
  let patchRowEndIndex = patchRowStartIndex
  while (
    patchRowEndIndex < oldRowList.length &&
    oldRowList[patchRowEndIndex].startIndex <= paragraphRange.end
  ) {
    patchRowEndIndex++
  }
  const rows = oldRowList.slice(patchRowStartIndex, patchRowEndIndex)
  if (!rows.length) {
    return null
  }
  return {
    startIndex: patchRowStartIndex,
    endIndex: patchRowEndIndex,
    rows
  }
}

/** 判断旧行窗口是否能被文本输入局部布局替换。 */
export function canPatchTextInputOldRows(rowList: IRow[]) {
  return !rowList.some(row => row.isSurround)
}

/** 判断新旧 patch 行结构是否仍可局部替换。 */
export function isTextInputPatchRowShapeStable(payload: {
  patchRows: IRow[]
  oldPatchRows: IRow[]
}) {
  const { patchRows, oldPatchRows } = payload
  return (
    patchRows.length === oldPatchRows.length &&
    !patchRows.some((row, index) => {
      const oldRow = oldPatchRows[index]
      return (
        Math.abs(row.height - oldRow.height) > 0.01 ||
        Math.abs((row.offsetY || 0) - (oldRow.offsetY || 0)) > 0.01
      )
    })
  )
}

/** 把局部重排行恢复成旧 runtime 行上下文。 */
export function applyTextInputPatchRowContext(payload: {
  patchRows: IRow[]
  oldPatchRows: IRow[]
  paragraphStartIndex: number
}) {
  payload.patchRows.forEach((row, rowIndex) => {
    const oldRow = payload.oldPatchRows[rowIndex]
    row.startIndex += payload.paragraphStartIndex
    row.rowIndex = oldRow.rowIndex
    row.offsetY = oldRow.offsetY
    row.isPageBreak = oldRow.isPageBreak
    row.elementList.forEach(element => {
      element.left = element.left || 0
    })
  })
}

/** 替换分页行列表中的文本输入局部行窗口。 */
export function patchTextInputPageRows(payload: {
  pageRowList: IRow[][]
  patchRowStartIndex: number
  oldPatchRowCount: number
  patchRows: IRow[]
}) {
  const nextPageRowList = payload.pageRowList.map(pageRows => pageRows.slice())
  let pageRowCursor = 0
  for (let pageNo = 0; pageNo < nextPageRowList.length; pageNo++) {
    const pageRows = nextPageRowList[pageNo]
    if (
      payload.patchRowStartIndex >= pageRowCursor &&
      payload.patchRowStartIndex < pageRowCursor + pageRows.length
    ) {
      const pagePatchStart = payload.patchRowStartIndex - pageRowCursor
      pageRows.splice(
        pagePatchStart,
        payload.oldPatchRowCount,
        ...payload.patchRows
      )
      break
    }
    pageRowCursor += pageRows.length
  }
  return nextPageRowList
}
