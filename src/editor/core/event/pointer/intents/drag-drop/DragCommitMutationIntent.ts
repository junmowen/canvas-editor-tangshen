import {
  CONTROL_CONTEXT_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR,
  EDITOR_ROW_ATTR,
  TITLE_CONTEXT_ATTR
} from '../../../../../dataset/constant/Element'
import { IElement } from '../../../../../interface/Element'
import { deepClone, omitObject } from '../../../../../utils'
import { formatElementContext } from '../../../../../utils/elementContext'
import { formatElementList } from '../../../../../utils/elementFormat'
import {
  cutControlDragSourceIfNeeded,
  insertDragDropIntoActiveControl
} from '../../../../modules/control/interaction/applyControlDragDropMutation'
import { shouldOmitControlContextForDragDrop } from '../../../../modules/control/policy/ControlDragPolicy'
import { Draw } from '../../../../draw/Draw'
import { appendListDragDropCopyAttrs } from '../../../../modules/list/interaction/ListDragDropContext'
import { isParagraphPlainTextDragElement } from '../../../../modules/paragraph/interaction/ParagraphIntentElementPolicy'
import { adjustTableDragDropPositionContext } from '../../../../modules/table/interaction/adjustTableDragDropPositionContext'
import { isTableDragSourceDeletable } from '../../../../modules/table/selection/isTableDragSourceDeletable'
import { createDragId, getElementIndexByDragId } from './DragCommitHelpers'
import { resolvePositionAtIndex } from '../../../../position/utils/resolvePositionAtIndex'

export function applyDragCommitMutation(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 选区范围，记录起止索引和方向信息。 */
  range: any
  /** 缓存选区范围，用于恢复拖拽或粘贴前的选择状态。 */
  cacheRange: any
  /** 缓存元素列表，用于拖拽或粘贴前保留原始内容。 */
  cacheElementList: IElement[]
  /** 缓存位置列表，用于恢复拖拽或粘贴前的布局坐标。 */
  cachePositionList: any[]
  /** 缓存位置上下文，用于恢复拖拽或粘贴前的命中状态。 */
  cachePositionContext: any
  /** 缓存起始索引，用于记录拖拽或粘贴前范围左边界。 */
  cacheStartIndex: number
  /** 缓存结束索引，用于记录拖拽或粘贴前范围右边界。 */
  cacheEndIndex: number
  /** 拖拽元素列表，保存正在移动的文档元素。 */
  dragElementList: IElement[]
  /** 是否包含控件，用于拖拽或删除时选择控件保护逻辑。 */
  isContainControl: boolean
  /** 是否保留来源上下文，用于拖拽后继续复用原始范围信息。 */
  isPreserveSourceContext?: boolean
}) {
  const {
    draw,
    range,
    cacheRange,
    cacheElementList,
    cachePositionList,
    cachePositionContext,
    cacheStartIndex,
    cacheEndIndex,
    dragElementList,
    isContainControl,
    isPreserveSourceContext = false
  } = payload
  const components = draw.getComponents()
  const rangeManager = components.range
  const control = components.control
  const elementList = draw.getObjectResolver().getElementList()
  const isOmitControlAttr = shouldOmitControlContextForDragDrop({
    control,
    targetElement: elementList[range.startIndex],
    dragElementList,
    isContainControl
  })
  const editorOptions = draw.getOptions()
  const replaceElementList = dragElementList.map(el => {
    if (isParagraphPlainTextDragElement(el)) {
      const newElement: IElement = {
        value: el.value
      }
      // 初始化 copy Attr 列表。
      const copyAttr = [...EDITOR_ELEMENT_STYLE_ATTR]
      if (isPreserveSourceContext) {
        copyAttr.push(...EDITOR_ROW_ATTR)
        copyAttr.push(...CONTROL_CONTEXT_ATTR)
      }
      appendListDragDropCopyAttrs({
        copyAttr,
        element: el,
        isPreserveSourceContext
      })
      if (!isOmitControlAttr) {
        copyAttr.push(...CONTROL_CONTEXT_ATTR)
      }
      copyAttr.forEach(attr => {
        if (isPreserveSourceContext && TITLE_CONTEXT_ATTR.includes(attr)) {
          return
        }
        const value = el[attr] as never
        if (value !== undefined) {
          newElement[attr] = value
        }
      })
      if (isPreserveSourceContext) {
        return omitObject(newElement, TITLE_CONTEXT_ATTR)
      }
      return newElement
    }
    let newElement = deepClone(el)
    if (isOmitControlAttr) {
      newElement = omitObject(newElement, CONTROL_CONTEXT_ATTR)
    }
    formatElementList([newElement], {
      isHandleFirstElement: false,
      editorOptions
    })
    if (isPreserveSourceContext) {
      newElement = omitObject(newElement, TITLE_CONTEXT_ATTR)
    }
    return newElement
  })
  if (!isPreserveSourceContext) {
    formatElementContext(elementList, replaceElementList, range.startIndex, {
      editorOptions: draw.getOptions()
    })
  }
  const cacheStartElement = cacheElementList[cacheStartIndex]
  const cacheStartPosition = cachePositionList[cacheStartIndex]
  const cacheRangeStartId = createDragId(cacheElementList[cacheStartIndex])
  const cacheRangeEndId = createDragId(cacheElementList[cacheEndIndex])
  const replaceLength = replaceElementList.length
  let rangeStart = range.startIndex
  let rangeEnd = rangeStart + replaceLength
  const controlInsertResult = insertDragDropIntoActiveControl({
    control,
    cacheElementList,
    rangeStart,
    replaceElementList,
    replaceLength
  })
  const activeControl = controlInsertResult?.activeControl ?? null
  if (controlInsertResult) {
    rangeStart = controlInsertResult.rangeStart
    rangeEnd = controlInsertResult.rangeEnd
  } else {
    draw.spliceElementList(elementList, rangeStart + 1, 0, replaceElementList)
  }
  if (!~rangeEnd) {
    return {
      applied: false,
      activeControl,
      cacheStartElement,
      rangeEndIndex: -1
    }
  }

  const rangeStartId = createDragId(elementList[rangeStart])
  const rangeEndId = createDragId(elementList[rangeEnd])
  const cacheRangeStartIndex = getElementIndexByDragId(
    cacheRangeStartId,
    cacheElementList
  )
  const cacheRangeEndIndex = getElementIndexByDragId(
    cacheRangeEndId,
    cacheElementList
  )
  const isControlDragSourceCut = cutControlDragSourceIfNeeded({
    control,
    rangeManager,
    cacheRange,
    cacheElementList,
    cacheRangeStartIndex,
    cacheRangeEndIndex
  })
  if (!isControlDragSourceCut) {
    if (isTableDragSourceDeletable({ draw, cachePositionContext })) {
      draw.spliceElementList(
        cacheElementList,
        cacheRangeStartIndex + 1,
        cacheRangeEndIndex - cacheRangeStartIndex
      )
    }
  }

  const startElement = elementList[range.startIndex]
  const startPosition = resolvePositionAtIndex(draw, range.startIndex)
  adjustTableDragDropPositionContext({
    draw,
    startElement,
    cacheStartElement,
    startPosition,
    cacheStartPosition,
    replaceLength
  })

  const rangeStartIndex = getElementIndexByDragId(rangeStartId, elementList)
  const rangeEndIndex = getElementIndexByDragId(rangeEndId, elementList)
  rangeManager.setRange(
    cacheRange.startIndex === cacheRange.endIndex ? rangeEndIndex : rangeStartIndex,
    rangeEndIndex,
    range.tableId,
    range.startTdIndex,
    range.endTdIndex,
    range.startTrIndex,
    range.endTrIndex
  )
  return {
    applied: true,
    activeControl,
    cacheStartElement,
    rangeEndIndex
  }
}
