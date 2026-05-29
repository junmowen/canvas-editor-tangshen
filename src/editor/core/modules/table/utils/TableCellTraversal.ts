import { IElement } from '../../../../interface/Element'
import { ITr } from '../../../../interface/table/Tr'
import { ITd } from '../../../../interface/table/Td'

/** 表格单元格traversal上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface ITableCellTraversalContext {
  /** 表格元素对象，作为表格遍历和渲染的入口。 */
  tableElement: IElement
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex: number
  /** 表格行对象，保存一行内的单元格结构。 */
  tr: ITr
  /** 表格单元格对象，保存单元格内容和样式。 */
  td: ITd
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number
}

/** 按表格原始行列顺序遍历全部单元格。 */
export function forEachTableCell(payload: {
  /** 表格元素对象，作为表格遍历和渲染的入口。 */
  tableElement: IElement
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex: number
  /** 遍历回调函数，用于处理每个命中的元素或单元格。 */
  visitor: (context: ITableCellTraversalContext) => boolean | void
}): boolean {
  const { tableElement, tableIndex, visitor } = payload
  const trList = tableElement.trList || []
  for (let trIndex = 0; trIndex < trList.length; trIndex++) {
    const tr = trList[trIndex]
    for (let tdIndex = 0; tdIndex < tr.tdList.length; tdIndex++) {
      const td = tr.tdList[tdIndex]
      const isContinue = visitor({
        tableElement,
        tableIndex,
        tr,
        td,
        trIndex,
        tdIndex
      })
      if (isContinue === false) return false
    }
  }
  return true
}

/** 从指定单元格开始，按前进或后退方向遍历后续单元格。 */
export function forEachTableCellByDirection(payload: {
  /** 表格元素对象，作为表格遍历和渲染的入口。 */
  tableElement: IElement
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex: number
  /** 起始表格行索引，用于限定表格遍历入口。 */
  startTrIndex: number
  /** 起始单元格索引，用于限定表格遍历入口。 */
  startTdIndex: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction: 'pre' | 'next'
  /** 是否跳过起始单元格，用于表格遍历时避免重复处理入口。 */
  isSkipStartCell?: boolean
  /** 遍历回调函数，用于处理每个命中的元素或单元格。 */
  visitor: (context: ITableCellTraversalContext) => boolean | void
}): boolean {
  const {
    tableElement,
    tableIndex,
    startTrIndex,
    startTdIndex,
    direction,
    isSkipStartCell = false,
    visitor
  } = payload
  const trList = tableElement.trList || []
  const isPre = direction === 'pre'
  const rowEnd = isPre ? -1 : trList.length
  for (
    let trIndex = startTrIndex;
    trIndex !== rowEnd;
    trIndex += isPre ? -1 : 1
  ) {
    const tr = trList[trIndex]
    if (!tr) continue
    const tdList = tr.tdList
    const rowStartTdIndex =
      trIndex === startTrIndex && isSkipStartCell
        ? startTdIndex + (isPre ? -1 : 1)
        : isPre
          ? tdList.length - 1
          : 0
    const cellEnd = isPre ? -1 : tdList.length
    for (
      let tdIndex = rowStartTdIndex;
      tdIndex !== cellEnd;
      tdIndex += isPre ? -1 : 1
    ) {
      const td = tdList[tdIndex]
      if (!td) continue
      const isContinue = visitor({
        tableElement,
        tableIndex,
        tr,
        td,
        trIndex,
        tdIndex
      })
      if (isContinue === false) return false
    }
  }
  return true
}

/** 根据表格、行列索引解析单元格上下文。 */
export function resolveTableCellByIndex(payload: {
  /** 表格元素对象，作为表格遍历和渲染的入口。 */
  tableElement: IElement | null | undefined
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number
}): ITableCellTraversalContext | null {
  const { tableElement, tableIndex, trIndex, tdIndex } = payload
  const tr = tableElement?.trList?.[trIndex]
  const td = tr?.tdList?.[tdIndex]
  if (!tableElement || !tr || !td) return null
  return {
    tableElement,
    tableIndex,
    tr,
    td,
    trIndex,
    tdIndex
  }
}
