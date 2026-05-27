import { EditorZone } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import { forEachTableCell } from '../../table/utils/TableCellTraversal'
import type { IElementTreeTableContext } from '../../utils/ElementTreeTraversal'
import { walkElementTree } from '../../utils/ElementTreeTraversal'
import { isControlEntryElement } from './controlValue'

export interface IControlTraversalContext {
  element: IElement
  elementList: IElement[]
  index: number
  cursorIndex: number
  zone?: EditorZone
  scopeAreaId?: string
  tableContext?: IControlTraversalTableContext
}

export interface IControlTraversalTableContext {
  tableId?: string
  tableIndex?: number
  trIndex?: number
  tdIndex?: number
  tdId?: string
}

interface IWalkControlElementListPayload {
  elementList: IElement[]
  zone?: EditorZone
  scopeAreaId?: string
  tableContext?: IControlTraversalTableContext
  isIncludeArea?: boolean
  isOnlyControlEntry?: boolean
  isRequireControl?: boolean
  visitor: (context: IControlTraversalContext) => number | void
}

/** 对表格每个 td.value 执行结构变换，专用于控件值批量规整。 */
export function transformTableCellValueList(
  element: IElement,
  transform: (elementList: IElement[]) => IElement[]
) {
  if (element.type !== ElementType.TABLE) return
  forEachTableCell({
    tableElement: element,
    tableIndex: -1,
    visitor: ({ td }) => {
      td.value = transform(td.value)
    }
  })
}

/**
 * 统一控件列表遍历入口。
 *
 * 负责表格和区域下钻、控件入口过滤、游标推进，业务回调只处理命中后的读写逻辑。
 */
export function walkControlElementList(payload: IWalkControlElementListPayload) {
  const {
    zone,
    scopeAreaId,
    isIncludeArea = false,
    isOnlyControlEntry = false,
    isRequireControl = true,
    visitor
  } = payload
  walkElementTree({
    elementList: payload.elementList,
    tableContext: toElementTreeTableContext(payload.tableContext),
    isVisitChildrenFirst: true,
    visitor: ({
      element,
      elementList,
      index,
      cursorIndex,
      tableContext
    }): number | void => {
      const controlTableContext = toControlTableContext(tableContext)
      if (
        isIncludeArea &&
        element.type === ElementType.AREA &&
        element.valueList?.length
      ) {
        walkControlElementList({
          ...payload,
          elementList: element.valueList,
          scopeAreaId: element.areaId || scopeAreaId,
          tableContext: controlTableContext
        })
      }
      if (isRequireControl && !element.control) return undefined
      if (
        isOnlyControlEntry &&
        element.controlComponent &&
        !isControlEntryElement({
          elementList,
          index
        })
      ) {
        return undefined
      }
      return visitor({
        element,
        elementList,
        index,
        cursorIndex,
        zone,
        scopeAreaId,
        tableContext: controlTableContext
      })
    }
  })
}

/** 将通用元素树表格上下文转换为控件遍历使用的上下文结构。 */
function toControlTableContext(
  tableContext: IElementTreeTableContext | undefined
): IControlTraversalTableContext | undefined {
  if (!tableContext) return undefined
  return {
    tableId: tableContext.tableId,
    tableIndex: tableContext.tableIndex,
    trIndex: tableContext.trIndex,
    tdIndex: tableContext.tdIndex,
    tdId: tableContext.tdId
  }
}

/** 兼容外部传入的控件表格上下文，继续交给通用元素树遍历。 */
function toElementTreeTableContext(
  tableContext: IControlTraversalTableContext | undefined
): IElementTreeTableContext | undefined {
  if (!tableContext || tableContext.tableIndex === undefined) {
    return undefined
  }
  return {
    isTable: true,
    tableIndex: tableContext.tableIndex,
    trIndex: tableContext.trIndex!,
    tdIndex: tableContext.tdIndex!,
    tdId: tableContext.tdId,
    tableId: tableContext.tableId
  }
}
