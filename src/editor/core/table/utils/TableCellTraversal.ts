import { IElement } from '../../../interface/Element'
import { ITr } from '../../../interface/table/Tr'
import { ITd } from '../../../interface/table/Td'

export interface ITableCellTraversalContext {
  tableElement: IElement
  tableIndex: number
  tr: ITr
  td: ITd
  trIndex: number
  tdIndex: number
}

/** 按表格原始行列顺序遍历全部单元格。 */
export function forEachTableCell(payload: {
  tableElement: IElement
  tableIndex: number
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
  tableElement: IElement
  tableIndex: number
  startTrIndex: number
  startTdIndex: number
  direction: 'pre' | 'next'
  isSkipStartCell?: boolean
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
  tableElement: IElement | null | undefined
  tableIndex: number
  trIndex: number
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
