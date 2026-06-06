import { IElement } from '../../../../interface/Element'
import { ISetControlValueOption } from '../../../../interface/Control'
import { deepClone } from '../../../../utils'
import { walkControlElementList } from './controlTraversal'
import {
  getCascadeParentValue,
  isCascadeParentMatched
} from './ControlValuePolicy'

/** 控件内部访问契约，用于在拆分模块间共享受控能力。 */
type ControlInternal = Record<string, any>

/** 已变更控件记录，用于驱动子控件级联选项刷新。 */
export interface IChangedControlRecord {
  /** 父控件入口元素。 */
  element: IElement
  /** 本次写入命中的业务载荷。 */
  payload: ISetControlValueOption
}

export const controlCascadeMethods = {
  applyCascadeControlOptions(
    this: ControlInternal,
    changedControlRecordList: IChangedControlRecord[]
  ) {
    if (!changedControlRecordList.length) return
    const applyCascade = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        isOnlyControlEntry: true,
        visitor: ({ element }): void => {
          const cascade = element.control?.cascade
          if (!cascade) return
          const parentRecord = changedControlRecordList.find(record =>
            isCascadeParentMatched({
              childElement: element,
              parentElement: record.element
            })
          )
          if (!parentRecord) return
          const parentValue = getCascadeParentValue({
            control: parentRecord.element.control!,
            option: parentRecord.payload
          })
          const nextValueSets =
            parentValue !== null ? cascade.valueSetMap[parentValue] : undefined
          element.control!.valueSets = nextValueSets ? deepClone(nextValueSets) : []
        }
      })
    }
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      applyCascade(elementList)
    }
  }
}
