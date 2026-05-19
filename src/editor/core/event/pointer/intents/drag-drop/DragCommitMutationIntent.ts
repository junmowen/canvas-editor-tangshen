import {
  CONTROL_CONTEXT_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR,
  EDITOR_ROW_ATTR,
  LIST_CONTEXT_ATTR,
  TITLE_CONTEXT_ATTR
} from '../../../../../dataset/constant/Element'
import { ControlComponent } from '../../../../../dataset/enum/Control'
import { ElementType } from '../../../../../dataset/enum/Element'
import { IElement } from '../../../../../interface/Element'
import { deepClone, omitObject } from '../../../../../utils'
import { formatElementContext, formatElementList } from '../../../../../utils/element'
import { Draw } from '../../../../draw/Draw'
import { createDragId, getElementIndexByDragId } from './DragCommitHelpers'

export function applyDragCommitMutation(payload: {
  draw: Draw
  range: any
  cacheRange: any
  cacheElementList: IElement[]
  cachePositionList: any[]
  cachePositionContext: any
  cacheStartIndex: number
  cacheEndIndex: number
  dragElementList: IElement[]
  isContainControl: boolean
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
  const position = components.position
  const rangeManager = components.range
  const control = components.control
  const elementList = draw.getElementList()
  const isOmitControlAttr =
    !isContainControl ||
    !!elementList[range.startIndex].controlId ||
    !control.getIsElementListContainFullControl(dragElementList)
  const editorOptions = draw.getOptions()
  const replaceElementList = dragElementList.map(el => {
    if (!el.type || el.type === ElementType.TEXT) {
      const newElement: IElement = {
        value: el.value
      }
      const copyAttr = [...EDITOR_ELEMENT_STYLE_ATTR]
      if (isPreserveSourceContext) {
        copyAttr.push(...EDITOR_ROW_ATTR)
        copyAttr.push(...LIST_CONTEXT_ATTR)
        copyAttr.push(...CONTROL_CONTEXT_ATTR)
      } else if (el.listId) {
        copyAttr.push(...LIST_CONTEXT_ATTR)
      }
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
  const activeControl = control.getActiveControl()
  if (
    activeControl &&
    cacheElementList[rangeStart].controlComponent !== ControlComponent.POSTFIX
  ) {
    rangeEnd = activeControl.setValue(replaceElementList)
    rangeStart = rangeEnd - replaceLength
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
  const cacheEndElement = cacheElementList[cacheRangeEndIndex]
  if (
    cacheEndElement.controlId &&
    cacheEndElement.controlComponent !== ControlComponent.POSTFIX
  ) {
    rangeManager.replaceRange({
      ...cacheRange,
      startIndex: cacheRangeStartIndex,
      endIndex: cacheRangeEndIndex
    })
    control.getActiveControl()?.cut()
  } else {
    let isTdElementDeletable = true
    if (cachePositionContext?.isTable) {
      const { tableId, trIndex, tdIndex } = cachePositionContext
      const originElementList = draw.getOriginalElementList()
      isTdElementDeletable = !originElementList.some(
        el =>
          el.id === tableId &&
          el?.trList?.[trIndex!]?.tdList?.[tdIndex!]?.deletable === false
      )
    }
    if (isTdElementDeletable) {
      draw.spliceElementList(
        cacheElementList,
        cacheRangeStartIndex + 1,
        cacheRangeEndIndex - cacheRangeStartIndex
      )
    }
  }

  const startElement = elementList[range.startIndex]
  const startPosition = position.getPositionList()[range.startIndex]
  let positionContextIndex = position.getPositionContext().index
  if (positionContextIndex) {
    if (startElement.tableId && !cacheStartElement.tableId) {
      if (cacheStartPosition.index < positionContextIndex) {
        positionContextIndex -= replaceLength
      }
    } else if (!startElement.tableId && cacheStartElement.tableId) {
      if (startPosition.index < positionContextIndex) {
        positionContextIndex += replaceLength
      }
    }
    position.setPositionContext({
      ...position.getPositionContext(),
      index: positionContextIndex
    })
  }

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
