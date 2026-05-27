import { ElementType } from '../../dataset/enum/Element'
import { IElement } from '../../interface/Element'
import { forEachTableCell } from '../table/utils/TableCellTraversal'

export interface IElementTreeTableContext {
  isTable: true
  tableIndex: number
  trIndex: number
  tdIndex: number
  tdId?: string
  trId?: string
  tableId?: string
}

export interface IElementTreeTraversalContext {
  element: IElement
  elementList: IElement[]
  index: number
  cursorIndex: number
  tableContext?: IElementTreeTableContext
}

interface IWalkElementTreePayload {
  elementList: IElement[]
  tableContext?: IElementTreeTableContext
  isIncludeValueList?: boolean
  isVisitChildrenFirst?: boolean
  visitor: (context: IElementTreeTraversalContext) => number | false | void
}

interface IFindElementTreePayload<T> {
  elementList: IElement[]
  tableContext?: IElementTreeTableContext
  isIncludeValueList?: boolean
  isVisitChildrenFirst?: boolean
  visitor: (context: IElementTreeTraversalContext) => T | null
}

/**
 * 通用元素树遍历。
 *
 * 统一处理普通元素列表里的表格单元格下钻，调用方只保留业务匹配和读写逻辑。
 */
export function walkElementTree(payload: IWalkElementTreePayload): boolean {
  const {
    elementList,
    tableContext,
    isVisitChildrenFirst = false,
    visitor
  } = payload
  let i = 0
  while (i < elementList.length) {
    const element = elementList[i]
    const visit = () =>
      visitor({
        element,
        elementList,
        index: i,
        cursorIndex: i + 1,
        tableContext
      })
    if (!isVisitChildrenFirst) {
      const nextIndex = visit()
      if (nextIndex === false) return false
      if (typeof nextIndex === 'number') {
        i = nextIndex
        continue
      }
    }
    if (!walkElementTreeChildren(payload, element, i)) {
      return false
    }
    if (isVisitChildrenFirst) {
      const nextIndex = visit()
      if (nextIndex === false) return false
      if (typeof nextIndex === 'number') {
        i = nextIndex
        continue
      }
    }
    i++
  }
  return true
}

/** 遍历当前元素的子节点：表格单元格和可选 valueList。 */
function walkElementTreeChildren(
  payload: IWalkElementTreePayload,
  element: IElement,
  index: number
): boolean {
  const { isIncludeValueList = false } = payload
  if (element.type === ElementType.TABLE) {
    const isContinue = forEachTableCell({
      tableElement: element,
      tableIndex: index,
      visitor: ({ tr, td, trIndex, tdIndex }) =>
        walkElementTree({
          ...payload,
          elementList: td.value,
          tableContext: {
            isTable: true,
            tableIndex: index,
            trIndex,
            tdIndex,
            tdId: td.id,
            trId: tr.id,
            tableId: element.id || element.tableId
          }
        })
    })
    if (!isContinue) return false
  }
  if (isIncludeValueList && element.valueList?.length) {
    const isContinue = walkElementTree({
      ...payload,
      elementList: element.valueList
    })
    if (!isContinue) return false
  }
  return true
}

/** 将通用表格上下文转换成 positionContext 使用的 index 命名。 */
export function createPositionTableContext(
  tableContext: IElementTreeTableContext | undefined
):
  | {
      isTable: true
      index: number
      trIndex: number
      tdIndex: number
      tdId?: string
      trId?: string
      tableId?: string
    }
  | undefined {
  if (!tableContext) return undefined
  return {
    isTable: true,
    index: tableContext.tableIndex,
    trIndex: tableContext.trIndex,
    tdIndex: tableContext.tdIndex,
    tdId: tableContext.tdId,
    trId: tableContext.trId,
    tableId: tableContext.tableId
  }
}

/** 在普通元素树中查找第一个命中结果，命中后立即停止遍历。 */
export function findElementTree<T>(
  payload: IFindElementTreePayload<T>
): T | null {
  let result: T | null = null
  walkElementTree({
    ...payload,
    visitor: context => {
      result = payload.visitor(context)
      return result !== null ? false : undefined
    }
  })
  return result
}
