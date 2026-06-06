import { ZERO } from '../../../dataset/constant/Common'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { TypesettingParagraphBlockType } from '../../../interface/TypesettingLayout'
import { isTableElement } from '../../modules/table/layout/TableRowLayoutPolicy'

/** 行内段落块片段。标题后接普通文本时，两者仍可同处一行，但快照要拆成不同块。 */
export interface ITypesettingParagraphBlockSegment {
  /** 片段所属行。 */
  row: IRow
  /** 片段所在页面内行偏移。 */
  pageRowOffset: number
  /** 片段在行内起始元素偏移。 */
  startElementOffset: number
  /** 片段在行内结束元素偏移。 */
  endElementOffset: number
  /** 片段左边界。 */
  left: number
  /** 片段上边界。 */
  top: number
  /** 片段右边界。 */
  right: number
  /** 片段下边界。 */
  bottom: number
  /** 片段类型。 */
  type: TypesettingParagraphBlockType
  /** 片段语义键，不包含普通段落自动编号。 */
  semanticKey: string
  /** 当前片段是否从显式段落起点开始。 */
  isParagraphStart: boolean
}

/** 创建行内片段列表，同一行里标题、列表和普通文本会按语义拆开。 */
export function createTypesettingRowSegmentList(payload: {
  /** 当前行。 */
  row: IRow
  /** 当前行左边界。 */
  rowLeft: number
  /** 当前行上边界。 */
  rowTop: number
  /** 当前行在页面内的偏移。 */
  pageRowOffset: number
}): ITypesettingParagraphBlockSegment[] {
  const { row, rowLeft, rowTop, pageRowOffset } = payload
  if (!row.elementList.length) {
    return []
  }
  if (row.isPageBreak) {
    return [
      createTypesettingRowSegment({
        row,
        pageRowOffset,
        rowLeft,
        rowTop,
        startElementOffset: 0,
        endElementOffset: row.elementList.length - 1,
        type: 'page-break',
        semanticKey: `page-break:${row.startIndex}`
      })
    ]
  }
  if (row.tableFragment) {
    return [
      createTypesettingRowSegment({
        row,
        pageRowOffset,
        rowLeft,
        rowTop,
        startElementOffset: 0,
        endElementOffset: row.elementList.length - 1,
        type: 'table',
        semanticKey: `table:${row.tableFragment.tableId || row.startIndex}`
      })
    ]
  }

  const segmentList: ITypesettingParagraphBlockSegment[] = []
  let segmentStartOffset = 0
  let currentKey = getElementBlockKey(row, 0)
  for (let offset = 1; offset < row.elementList.length; offset++) {
    const nextKey = getElementBlockKey(row, offset)
    if (nextKey.semanticKey === currentKey.semanticKey) {
      continue
    }
    segmentList.push(
      createTypesettingRowSegment({
        row,
        pageRowOffset,
        rowLeft,
        rowTop,
        startElementOffset: segmentStartOffset,
        endElementOffset: offset - 1,
        type: currentKey.type,
        semanticKey: currentKey.semanticKey
      })
    )
    segmentStartOffset = offset
    currentKey = nextKey
  }
  segmentList.push(
    createTypesettingRowSegment({
      row,
      pageRowOffset,
      rowLeft,
      rowTop,
      startElementOffset: segmentStartOffset,
      endElementOffset: row.elementList.length - 1,
      type: currentKey.type,
      semanticKey: currentKey.semanticKey
    })
  )
  return segmentList
}

/** 获取片段内第一个具备排版语义的元素，跳过行首零宽补偿字符。 */
export function getTypesettingSegmentContextElement(
  segment: ITypesettingParagraphBlockSegment
): IElement | undefined {
  return (
    findSemanticElementInRange(
      segment.row,
      segment.startElementOffset,
      segment.endElementOffset
    ) || segment.row.elementList[segment.startElementOffset]
  )
}

/** 创建单个行内片段，并用真实元素宽度计算片段矩形。 */
function createTypesettingRowSegment(payload: {
  /** 当前行。 */
  row: IRow
  /** 当前行在页面内的偏移。 */
  pageRowOffset: number
  /** 当前行左边界。 */
  rowLeft: number
  /** 当前行上边界。 */
  rowTop: number
  /** 片段在行内起始元素偏移。 */
  startElementOffset: number
  /** 片段在行内结束元素偏移。 */
  endElementOffset: number
  /** 片段类型。 */
  type: TypesettingParagraphBlockType
  /** 片段语义键。 */
  semanticKey: string
}): ITypesettingParagraphBlockSegment {
  const {
    row,
    pageRowOffset,
    rowLeft,
    rowTop,
    startElementOffset,
    endElementOffset,
    type,
    semanticKey
  } = payload
  const beforeWidth = getRowElementRangeWidth(row, 0, startElementOffset - 1)
  const segmentWidth = getRowElementRangeWidth(
    row,
    startElementOffset,
    endElementOffset
  )
  return {
    row,
    pageRowOffset,
    startElementOffset,
    endElementOffset,
    left: rowLeft + beforeWidth,
    top: rowTop,
    right: rowLeft + beforeWidth + segmentWidth,
    bottom: rowTop + row.height,
    type,
    semanticKey,
    isParagraphStart:
      row.elementList[startElementOffset]?.value === ZERO &&
      !row.elementList[startElementOffset]?.listWrap
  }
}

/** 计算行内指定元素范围的宽度，复用行测量阶段写入的 metrics。 */
function getRowElementRangeWidth(
  row: IRow,
  startElementOffset: number,
  endElementOffset: number
) {
  if (endElementOffset < startElementOffset) {
    return 0
  }
  let width = 0
  for (
    let offset = Math.max(0, startElementOffset);
    offset <= Math.min(row.elementList.length - 1, endElementOffset);
    offset++
  ) {
    width += row.elementList[offset].metrics?.width || 0
  }
  return width
}

/** 解析元素所属的段落块语义。 */
function getElementBlockKey(row: IRow, elementOffset: number): {
  /** 段落块类型。 */
  type: TypesettingParagraphBlockType
  /** 段落块语义键。 */
  semanticKey: string
} {
  const element = getElementContextForOffset(row, elementOffset)
  return createElementBlockKey(element, row.startIndex)
}

/** 行首零宽段落符采用后续可见内容的语义，避免生成空标题/列表前置块。 */
function getElementContextForOffset(
  row: IRow,
  elementOffset: number
): IElement | undefined {
  const element = row.elementList[elementOffset]
  if (element?.value !== ZERO) {
    return element
  }
  return findSemanticElementInRange(
    row,
    elementOffset + 1,
    row.elementList.length - 1
  ) || element
}

/** 根据元素语义生成段落块键。 */
function createElementBlockKey(
  element: IElement | undefined,
  defaultIndex: number
): {
  /** 段落块类型。 */
  type: TypesettingParagraphBlockType
  /** 段落块语义键。 */
  semanticKey: string
} {
  if (element?.titleId) {
    return { type: 'title', semanticKey: `title:${element.titleId}` }
  }
  if (element?.listId) {
    return {
      type: 'list',
      semanticKey: `list:${element.listId}:${element.listLevel || 0}`
    }
  }
  if (element?.areaId) {
    return { type: 'area', semanticKey: `area:${element.areaId}` }
  }
  if (element?.tableId || (element && isTableElement(element))) {
    return {
      type: 'table',
      semanticKey: `table:${element.tableId || element.id || defaultIndex}`
    }
  }
  return { type: 'paragraph', semanticKey: 'paragraph' }
}

/** 在指定行内范围查找第一个具备段落块语义的可见元素。 */
function findSemanticElementInRange(
  row: IRow,
  startElementOffset: number,
  endElementOffset: number
): IElement | undefined {
  for (
    let offset = Math.max(0, startElementOffset);
    offset <= Math.min(row.elementList.length - 1, endElementOffset);
    offset++
  ) {
    const element = row.elementList[offset]
    if (isSemanticVisibleElement(element)) {
      return element
    }
  }
  return undefined
}

/** 判断元素是否可作为段落块语义上下文。 */
function isSemanticVisibleElement(element: IElement | undefined) {
  return !!(
    element &&
    element.value !== ZERO &&
    (element.titleId ||
      element.listId ||
      element.areaId ||
      element.tableId ||
      isTableElement(element))
  )
}
