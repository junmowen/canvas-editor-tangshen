import { IElement } from '../../interface/Element'
import type { IElementTreeTableContext } from '../shared/traversal/ElementTreeTraversal'
import {
  createPositionTableContext,
  findElementTree,
  walkElementTree
} from '../shared/traversal/ElementTreeTraversal'

/** command元素traversal上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface ICommandElementTraversalContext {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
  /** 表格上下文，保存当前元素所在表格、行和单元格定位。 */
  tableContext?: ICommandElementTableContext
}

/** command元素表格上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface ICommandElementTableContext {
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable: true
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number
  /** 单元格标识，用于关联单元格位置、片段和选区。 */
  tdId?: string
  /** 表格行标识，用于关联行位置、片段和选区。 */
  trId?: string
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
}

/** walkcommand元素列表调用载荷，聚合执行该操作所需的输入数据。 */
interface IWalkCommandElementListPayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 表格上下文，保存当前元素所在表格、行和单元格定位。 */
  tableContext?: ICommandElementTableContext
  /** 是否包含控件值列表，用于控制遍历是否进入控件内部。 */
  isIncludeValueList?: boolean
  /** 遍历回调函数，用于处理每个命中的元素或单元格。 */
  visitor: (context: ICommandElementTraversalContext) => number | void
}

/** findcommand元素列表调用载荷，聚合执行该操作所需的输入数据。 */
interface IFindCommandElementListPayload<T> {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 表格上下文，保存当前元素所在表格、行和单元格定位。 */
  tableContext?: ICommandElementTableContext
  /** 是否包含控件值列表，用于控制遍历是否进入控件内部。 */
  isIncludeValueList?: boolean
  /** 遍历回调函数，用于处理每个命中的元素或单元格。 */
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
