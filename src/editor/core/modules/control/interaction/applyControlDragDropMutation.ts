import { ControlComponent } from '../../../../dataset/enum/Control'
import { IControlInstance } from '../../../../interface/Control'
import { IElement } from '../../../../interface/Element'
import { IRange } from '../../../../interface/Range'
import { Control } from '../runtime/Control'
import { RangeManager } from '../../../range/RangeManager'

/** 拖拽提交时，如果落点在当前控件值域内，则把拖拽内容写入控件值。 */
export function insertDragDropIntoActiveControl(payload: {
  /** 控件管理器，负责控件值写入和当前激活控件访问。 */
  control: Control
  /** 拖拽前的元素列表，用于判断落点是否为控件后缀。 */
  cacheElementList: IElement[]
  /** 目标范围起始索引。 */
  rangeStart: number
  /** 待插入的元素列表。 */
  replaceElementList: IElement[]
  /** 待插入元素数量。 */
  replaceLength: number
}) {
  const {
    control,
    cacheElementList,
    rangeStart,
    replaceElementList,
    replaceLength
  } = payload
  const activeControl = control.getActiveControl()
  if (
    !activeControl ||
    cacheElementList[rangeStart].controlComponent === ControlComponent.POSTFIX
  ) {
    return null
  }
  const rangeEnd = activeControl.setValue(replaceElementList)
  return {
    activeControl,
    rangeStart: rangeEnd - replaceLength,
    rangeEnd
  }
}

/** 拖拽源位于控件值域内时，恢复源选区并交给控件执行剪切。 */
export function cutControlDragSourceIfNeeded(payload: {
  /** 控件管理器，负责当前激活控件访问和剪切。 */
  control: Control
  /** 选区管理器，用于恢复拖拽源选区。 */
  rangeManager: RangeManager
  /** 拖拽前缓存的选区。 */
  cacheRange: IRange
  /** 拖拽前的元素列表。 */
  cacheElementList: IElement[]
  /** 拖拽源范围起始索引。 */
  cacheRangeStartIndex: number
  /** 拖拽源范围结束索引。 */
  cacheRangeEndIndex: number
}) {
  const {
    control,
    rangeManager,
    cacheRange,
    cacheElementList,
    cacheRangeStartIndex,
    cacheRangeEndIndex
  } = payload
  const cacheEndElement = cacheElementList[cacheRangeEndIndex]
  if (
    !cacheEndElement.controlId ||
    cacheEndElement.controlComponent === ControlComponent.POSTFIX
  ) {
    return false
  }
  rangeManager.replaceRange({
    ...cacheRange,
    startIndex: cacheRangeStartIndex,
    endIndex: cacheRangeEndIndex
  })
  control.getActiveControl()?.cut()
  return true
}

/** 拖拽提交后按控件来源派发内容变更事件。 */
export function emitControlDragDropContentChange(payload: {
  /** 控件管理器，负责派发控件内容变更事件。 */
  control: Control
  /** 当前激活控件；存在时说明拖拽内容写入了 active control。 */
  activeControl: IControlInstance | null
  /** 拖拽源起点元素，用于非 active control 场景下定位原控件。 */
  cacheStartElement: IElement
  /** 拖拽前缓存的选区。 */
  cacheRange: IRange
  /** 拖拽前的元素列表。 */
  cacheElementList: IElement[]
}) {
  const {
    control,
    activeControl,
    cacheStartElement,
    cacheRange,
    cacheElementList
  } = payload
  if (activeControl) {
    control.emitControlContentChange()
    return
  }
  if (cacheStartElement.controlId) {
    control.emitControlContentChange({
      context: {
        range: cacheRange,
        elementList: cacheElementList
      },
      controlElement: cacheStartElement
    })
  }
}
