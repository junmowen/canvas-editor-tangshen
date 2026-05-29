import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import { forEachTableCell } from '../../modules/table/utils/TableCellTraversal'

/** 元素tree表格上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface IElementTreeTableContext {
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable: true
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex: number
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

/** 元素treetraversal上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface IElementTreeTraversalContext {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
  /** 表格上下文，保存当前元素所在表格、行和单元格定位。 */
  tableContext?: IElementTreeTableContext
}

/** walk元素tree调用载荷，聚合执行该操作所需的输入数据。 */
interface IWalkElementTreePayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 表格上下文，保存当前元素所在表格、行和单元格定位。 */
  tableContext?: IElementTreeTableContext
  /** 是否包含控件值列表，用于控制遍历是否进入控件内部。 */
  isIncludeValueList?: boolean
  /** 是否优先访问子元素，用于控制树遍历顺序。 */
  isVisitChildrenFirst?: boolean
  /** 遍历回调函数，用于处理每个命中的元素或单元格。 */
  visitor: (context: IElementTreeTraversalContext) => number | false | void
}

/** find元素tree调用载荷，聚合执行该操作所需的输入数据。 */
interface IFindElementTreePayload<T> {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 表格上下文，保存当前元素所在表格、行和单元格定位。 */
  tableContext?: IElementTreeTableContext
  /** 是否包含控件值列表，用于控制遍历是否进入控件内部。 */
  isIncludeValueList?: boolean
  /** 是否优先访问子元素，用于控制树遍历顺序。 */
  isVisitChildrenFirst?: boolean
  /** 遍历回调函数，用于处理每个命中的元素或单元格。 */
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
