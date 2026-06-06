import { ZERO } from '../../../../dataset/constant/Common'
import { TitleLevel } from '../../../../dataset/enum/Title'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { ITitleTree, ITitleTreeNode } from '../../../../interface/Title'
import { isTextLikeElement } from '../../../../utils/elementLayout'
import { walkElementTree } from '../../../shared/traversal/ElementTreeTraversal'

/** 标题层级排序，用于把一到六级标题转换成可比较的数字。 */
const TITLE_LEVEL_ORDER: Record<TitleLevel, number> = {
  [TitleLevel.FIRST]: 1,
  [TitleLevel.SECOND]: 2,
  [TitleLevel.THIRD]: 3,
  [TitleLevel.FOURTH]: 4,
  [TitleLevel.FIFTH]: 5,
  [TitleLevel.SIXTH]: 6
}

/** 构建标题树所需的输入。 */
interface IBuildTitleTreePayload {
  /** 文档元素列表，使用当前正文内部元素顺序。 */
  elementList: IElement[]
  /** 布局位置列表，用于补充标题所在页码。 */
  positionList: IElementPosition[]
}

/** 标题扫描记录，保存树构建前的线性标题信息。 */
interface ITitleTreeRecord {
  /** 标题唯一标识，来源于标题元素的 titleId。 */
  id: string
  /** 标题文本，已去除零宽占位字符。 */
  name: string
  /** 标题级别。 */
  level: TitleLevel
  /** 标题起始元素索引；表格内标题为单元格局部索引。 */
  startIndex: number
  /** 标题结束元素索引；表格内标题为单元格局部索引。 */
  endIndex: number
  /** 标题起始页码；无法定位时为 null。 */
  pageNo: number | null
  /** 表格 id；标题不在表格中时为空。 */
  tableId?: string
  /** 表格行索引；标题不在表格中时为空。 */
  trIndex?: number
  /** 表格单元格索引；标题不在表格中时为空。 */
  tdIndex?: number
}

/** 构建当前文档标题父子树。 */
export function buildTitleTree(
  payload: IBuildTitleTreePayload
): ITitleTree | null {
  const recordList = collectTitleRecordList(payload)
  if (!recordList.length) return null

  const rootList: ITitleTreeNode[] = []
  const nodeList: ITitleTreeNode[] = []
  const stack: ITitleTreeNode[] = []

  for (let order = 0; order < recordList.length; order++) {
    const record = recordList[order]
    const levelOrder = TITLE_LEVEL_ORDER[record.level]
    while (
      stack.length &&
      TITLE_LEVEL_ORDER[stack[stack.length - 1].level] >= levelOrder
    ) {
      stack.pop()
    }
    const parent = stack[stack.length - 1] || null
    const node: ITitleTreeNode = {
      id: record.id,
      name: record.name,
      level: record.level,
      parentTitleId: parent?.id || null,
      childrenTitleIds: [],
      childList: [],
      path: parent ? [...parent.path, record.id] : [record.id],
      order,
      depth: parent ? parent.depth + 1 : 0,
      startIndex: record.startIndex,
      endIndex: record.endIndex,
      rangeStartIndex: record.startIndex,
      rangeEndIndex: record.endIndex,
      contentStartIndex: record.endIndex + 1,
      contentEndIndex: record.endIndex,
      nextBoundaryTitleId: null,
      pageNo: record.pageNo,
      tableId: record.tableId,
      trIndex: record.trIndex,
      tdIndex: record.tdIndex
    }
    if (parent) {
      parent.childrenTitleIds.push(node.id)
      parent.childList.push(node)
    } else {
      rootList.push(node)
    }
    nodeList.push(node)
    stack.push(node)
  }

  attachTitleSectionRangeList({
    nodeList,
    documentElementCount: payload.elementList.length
  })

  return {
    rootList,
    nodeList
  }
}

/** 补齐每个标题覆盖的章节范围，供按章导出和章节拖拽直接消费标题树。 */
function attachTitleSectionRangeList(payload: {
  /** 按文档顺序排列的标题节点。 */
  nodeList: ITitleTreeNode[]
  /** 正文元素总数，用于最后一个标题延伸到文档末尾。 */
  documentElementCount: number
}): void {
  const { nodeList, documentElementCount } = payload
  const documentEndIndex = Math.max(0, documentElementCount - 1)

  for (let index = 0; index < nodeList.length; index++) {
    const node = nodeList[index]
    const currentLevelOrder = TITLE_LEVEL_ORDER[node.level]
    let boundaryNode: ITitleTreeNode | null = null
    for (let nextIndex = index + 1; nextIndex < nodeList.length; nextIndex++) {
      const nextNode = nodeList[nextIndex]
      if (TITLE_LEVEL_ORDER[nextNode.level] <= currentLevelOrder) {
        boundaryNode = nextNode
        break
      }
    }
    const boundaryStartIndex =
      boundaryNode?.startIndex ?? documentElementCount

    node.rangeStartIndex = node.startIndex
    node.rangeEndIndex = Math.max(
      node.endIndex,
      Math.min(documentEndIndex, boundaryStartIndex - 1)
    )
    node.contentStartIndex = node.endIndex + 1
    node.contentEndIndex = node.rangeEndIndex
    node.nextBoundaryTitleId = boundaryNode?.id || null
  }
}

/** 收集文档中的连续标题块，作为标题树构建的线性输入。 */
function collectTitleRecordList(
  payload: IBuildTitleTreePayload
): ITitleTreeRecord[] {
  const recordList: ITitleTreeRecord[] = []
  const { elementList, positionList } = payload

  walkElementTree({
    elementList,
    visitor: ({ element, elementList, index, tableContext }): number | void => {
      if (tableContext && index === 0) return undefined
      if (!element.titleId || !element.level) return undefined

      const titleId = element.titleId
      const valueList: IElement[] = []
      let endIndex = index
      while (endIndex < elementList.length) {
        const titleElement = elementList[endIndex]
        if (titleElement.titleId !== titleId) {
          endIndex--
          break
        }
        valueList.push(titleElement)
        endIndex++
      }
      if (endIndex >= elementList.length) {
        endIndex = elementList.length - 1
      }

      const titlePosition = positionList[index]
      const tablePageNo = tableContext
        ? positionList[tableContext.tableIndex]?.pageNo
        : undefined
      recordList.push({
        id: titleId,
        name: valueList
          .filter(isTextLikeElement)
          .map(titleElement => titleElement.value)
          .join('')
          .replace(new RegExp(ZERO, 'g'), ''),
        level: element.level,
        startIndex: index,
        endIndex,
        pageNo: titlePosition?.pageNo ?? tablePageNo ?? null,
        tableId: tableContext?.tableId,
        trIndex: tableContext?.trIndex,
        tdIndex: tableContext?.tdIndex
      })
      return endIndex + 1
    }
  })

  return recordList
}
