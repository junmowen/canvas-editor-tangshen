import { IElement } from '../../interface/Element'
import type { IElementTreeTableContext } from '../utils/ElementTreeTraversal'
import {
  createPositionTableContext,
  findElementTree,
  walkElementTree
} from '../utils/ElementTreeTraversal'

export interface ICommandElementTraversalContext {
  element: IElement
  elementList: IElement[]
  index: number
  cursorIndex: number
  tableContext?: ICommandElementTableContext
}

export interface ICommandElementTableContext {
  isTable: true
  index: number
  trIndex: number
  tdIndex: number
  tdId?: string
  trId?: string
  tableId?: string
}

interface IWalkCommandElementListPayload {
  elementList: IElement[]
  tableContext?: ICommandElementTableContext
  isIncludeValueList?: boolean
  visitor: (context: ICommandElementTraversalContext) => number | void
}

interface IFindCommandElementListPayload<T> {
  elementList: IElement[]
  tableContext?: ICommandElementTableContext
  isIncludeValueList?: boolean
  visitor: (context: ICommandElementTraversalContext) => T | null
}

/**
 * 命令层通用元素遍历。
 *
 * 统一处理表格单元格下钻和可选的 valueList 下钻，命令方法只保留匹配和变更逻辑。
 */
export function walkCommandElementList(
  payload: IWalkCommandElementListPayload
) {
  walkElementTree({
    elementList: payload.elementList,
    tableContext: toElementTreeTableContext(payload.tableContext),
    isIncludeValueList: payload.isIncludeValueList,
    isVisitChildrenFirst: true,
    visitor: ({ element, elementList, index, cursorIndex, tableContext }) =>
      payload.visitor({
        element,
        elementList,
        index,
        cursorIndex,
        tableContext: createPositionTableContext(tableContext)
      })
  })
}

export function findCommandElementList<T>(
  payload: IFindCommandElementListPayload<T>
): T | null {
  return findElementTree<T>({
    elementList: payload.elementList,
    tableContext: toElementTreeTableContext(payload.tableContext),
    isIncludeValueList: payload.isIncludeValueList,
    isVisitChildrenFirst: true,
    visitor: ({ element, elementList, index, cursorIndex, tableContext }) =>
      payload.visitor({
        element,
        elementList,
        index,
        cursorIndex,
        tableContext: createPositionTableContext(tableContext)
      })
  })
}

function toElementTreeTableContext(
  tableContext: ICommandElementTableContext | undefined
): IElementTreeTableContext | undefined {
  if (!tableContext) return undefined
  return {
    isTable: true,
    tableIndex: tableContext.index,
    trIndex: tableContext.trIndex,
    tdIndex: tableContext.tdIndex,
    tdId: tableContext.tdId,
    trId: tableContext.trId,
    tableId: tableContext.tableId
  }
}
