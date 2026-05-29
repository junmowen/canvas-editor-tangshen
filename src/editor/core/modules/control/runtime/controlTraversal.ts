import { EditorZone } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import { forEachTableCell } from '../../table/utils/TableCellTraversal'
import type { IElementTreeTableContext } from '../../../shared/traversal/ElementTreeTraversal'
import { walkElementTree } from '../../../shared/traversal/ElementTreeTraversal'
import { isControlEntryElement } from './controlValue'

/** 控件traversal上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface IControlTraversalContext {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
  /** 作用域区域标识，用于限定控件匹配和遍历范围。 */
  scopeAreaId?: string
  /** 表格上下文，保存当前元素所在表格、行和单元格定位。 */
  tableContext?: IControlTraversalTableContext
}

/** 控件traversal表格上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface IControlTraversalTableContext {
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex?: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 单元格标识，用于关联单元格位置、片段和选区。 */
  tdId?: string
}

/** walk控件元素列表调用载荷，聚合执行该操作所需的输入数据。 */
interface IWalkControlElementListPayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
  /** 作用域区域标识，用于限定控件匹配和遍历范围。 */
  scopeAreaId?: string
  /** 表格上下文，保存当前元素所在表格、行和单元格定位。 */
  tableContext?: IControlTraversalTableContext
  /** 是否包含区域元素，用于控制遍历是否进入页眉页脚等区域。 */
  isIncludeArea?: boolean
  /** 是否仅访问控件入口元素，用于避免重复遍历控件值。 */
  isOnlyControlEntry?: boolean
  /** 是否要求命中控件，用于过滤非控件元素。 */
  isRequireControl?: boolean
  /** 遍历回调函数，用于处理每个命中的元素或单元格。 */
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
