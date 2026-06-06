import { ControlComponent, ControlType } from '../../../../dataset/enum/Control'
import { ElementType } from '../../../../dataset/enum/Element'
import { CONTROL_STYLE_ATTR } from '../../../../dataset/constant/Element'
import { IElement } from '../../../../interface/Element'
import {
  IControlBatchSetResult,
  IControlContext,
  IControlInstance,
  IControlRuleOption,
  ISetControlValueOption
} from '../../../../interface/Control'
import { deepClone, isArray, isString, pickObject } from '../../../../utils'
import {
  getControlInlineContentText,
  getControlInlineText
} from '../../../../utils/elementControl'
import { formatElementList } from '../../../../utils/elementFormat'
import { CheckboxControl } from './checkbox/CheckboxControl'
import { RadioControl } from './radio/RadioControl'
import { SelectControl } from './select/SelectControl'
import { TextControl } from './text/TextControl'
import { DateControl } from './date/DateControl'
import { NumberControl } from './number/NumberControl'
import { resolveControlBlockEndIndex } from './controlScan'
import { createExpandedNestedControlValueElementList } from './controlNested'
import { walkControlElementList } from './controlTraversal'
import { findMatchedControlIdentity } from './controlMatch'
import { isChoiceControlType, isTextLikeControlType } from './controlType'
import type { Control } from './Control'
import {
  IChangedControlRecord
} from './ControlCascadeMethods'
import {
  createControlBatchResult
} from './ControlValuePolicy'

/** 控件内部访问契约，用于在拆分模块间共享受控能力。 */
type ControlInternal = Record<string, any>

/** 文本like控件实例契约，定义运行期对象需要暴露的能力。 */
interface ITextLikeControlInstance extends IControlInstance {
  setValue(
    data: IElement[],
    context?: IControlContext,
    options?: IControlRuleOption
  ): number
  clearValue(context?: IControlContext, options?: IControlRuleOption): number
}

/** choice控件实例契约，定义运行期对象需要暴露的能力。 */
interface IChoiceControlInstance extends IControlInstance {
  setSelect(
    value: string[] | string,
    context?: IControlContext,
    options?: IControlRuleOption
  ): number | void
}

declare module './Control' {
  /** 控件契约，用于约束内部流程中传递的数据结构。 */
  interface Control {
    setValueListById(payload: ISetControlValueOption[]): IControlBatchSetResult<ISetControlValueOption>
  }
}

export const controlValueSetMethods = {
  isNestedControlValueElement(this: ControlInternal, element: IElement): boolean {
    return (
      element.type === ElementType.CONTROL &&
      element.controlComponent === ControlComponent.VALUE &&
      !!element.control
    )
  },

  getStringControlValueElementList(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value']
  ): IElement[] {
    if (!value || Array.isArray(value)) return []
    const elementStyle = pickObject(
      element,
      CONTROL_STYLE_ATTR as Array<keyof IElement>
    ) as Partial<IElement>
    const controlStyle = pickObject(
      element.control!,
      CONTROL_STYLE_ATTR as Array<keyof NonNullable<IElement['control']>>
    ) as unknown as Partial<IElement>
    return [
      {
        ...elementStyle,
        ...controlStyle,
        value
      }
    ]
  },

  getNormalizedControlValueList(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value']
  ): IElement[] {
    return Array.isArray(value)
      ? deepClone(value)
      : this.getStringControlValueElementList(element, value)
  },

  applyNestedTextLikeControlValue(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value']
  ): IElement[] {
    const formatValue = this.getNormalizedControlValueList(element, value)
    if (formatValue.length) {
      formatElementList(formatValue, {
        isHandleFirstElement: false,
        editorOptions: this.options
      })
    }
    element.control!.value = formatValue
    return formatValue
  },

  applyTextLikeControlValueById(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption,
    ControlClass: new (
      element: IElement,
      control: Control
    ) => ITextLikeControlInstance
  ) {
    // 创建 control 实例。
    const control = new ControlClass(element, this as any)
    this.activeControl = control
    const formatValue = this.getNormalizedControlValueList(element, value)
    if (formatValue.length) {
      formatElementList(formatValue, {
        isHandleFirstElement: false,
        editorOptions: this.options
      })
      control.setValue(formatValue, controlContext, controlRule)
    } else {
      control.clearValue(controlContext, controlRule)
    }
  },

  applySelectControlValueById(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption
  ) {
    if (Array.isArray(value)) return
    // 创建 control 实例。
    const control = new SelectControl(element, this as any)
    this.activeControl = control
    if (value) {
      control.setSelect(value, controlContext, controlRule)
    } else {
      control.clearSelect(controlContext, controlRule)
    }
  },

  applyCodeControlValueById(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption,
    ControlClass: new (element: IElement, control: Control) => IChoiceControlInstance,
    isMultiValue: boolean
  ) {
    if (Array.isArray(value)) return
    // 创建 control 实例。
    const control = new ControlClass(element, this as any)
    this.activeControl = control
    const codes = value
      ? isMultiValue
        ? String(value).split(',')
        : [String(value)]
      : []
    control.setSelect(codes, controlContext, controlRule)
  },

  applyDateControlValueById(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption
  ) {
    // 创建 date 实例。
    const date = new DateControl(element, this as any)
    this.activeControl = date
    if (isArray(value)) {
      if (value.length) {
        formatElementList(value, {
          isHandleFirstElement: false,
          editorOptions: this.options
        })
      }
      date.setValue(value, controlContext, controlRule)
    } else if (isString(value)) {
      date.setSelect(value, controlContext, controlRule)
    } else {
      date.clearSelect(controlContext, controlRule)
    }
  },

  applyControlValueById(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption
  ) {
    const { type } = element.control!
    if (type === ControlType.TEXT) {
      this.applyTextLikeControlValueById(
        element,
        value,
        controlContext,
        controlRule,
        TextControl
      )
    } else if (type === ControlType.SELECT) {
      this.applySelectControlValueById(
        element,
        value,
        controlContext,
        controlRule
      )
    } else if (type === ControlType.CHECKBOX) {
      this.applyCodeControlValueById(
        element,
        value,
        controlContext,
        controlRule,
        CheckboxControl,
        true
      )
    } else if (type === ControlType.RADIO) {
      this.applyCodeControlValueById(
        element,
        value,
        controlContext,
        controlRule,
        RadioControl,
        false
      )
    } else if (type === ControlType.DATE) {
      this.applyDateControlValueById(
        element,
        value,
        controlContext,
        controlRule
      )
    } else if (type === ControlType.NUMBER) {
      this.applyTextLikeControlValueById(
        element,
        value,
        controlContext,
        controlRule,
        NumberControl
      )
    }
  },

  setNestedControlValue(
    this: ControlInternal,
    element: IElement,
    value: ISetControlValueOption['value'],
    elementList?: IElement[]
  ) {
    const control = element.control!
    if (isTextLikeControlType(control.type)) {
      this.applyNestedTextLikeControlValue(element, value)
    } else if (isChoiceControlType(control.type)) {
      control.code = Array.isArray(value) ? null : value
      control.value = null
    }
    element.value = this.getIsOnlyNestedControlValue(element, elementList)
      ? getControlInlineContentText(element, this.options)
      : getControlInlineText(element, this.options)
  },

  setExpandedNestedControlValue(
    this: ControlInternal,
    elementList: IElement[],
    prefixIndex: number,
    value: ISetControlValueOption['value']
  ): number {
    const prefixElement = elementList[prefixIndex]
    const controlId = prefixElement.controlId
    if (!controlId) return prefixIndex + 1
    const control = prefixElement.control!
    let endIndex = prefixIndex + 1
    while (endIndex < elementList.length) {
      const nextElement = elementList[endIndex]
      if (nextElement.controlId !== controlId) break
      endIndex++
    }
    if (isTextLikeControlType(control.type)) {
      const formatValue = this.applyNestedTextLikeControlValue(
        prefixElement,
        value
      )
      const valueElementList = createExpandedNestedControlValueElementList({
        prefixElement,
        control,
        valueElementList: formatValue
      })
      elementList.splice(prefixIndex + 1, endIndex - prefixIndex - 2, ...valueElementList)
      return prefixIndex + valueElementList.length + 2
    }
    return endIndex
  },

  setValueListById(
    this: ControlInternal,
    payload: ISetControlValueOption[]
  ): IControlBatchSetResult<ISetControlValueOption> {
    const matchedPayloadSet = new Set<ISetControlValueOption>()
    if (!payload.length) {
      return createControlBatchResult(payload, matchedPayloadSet)
    }
    let isExistSet = false
    let isExistSubmitHistory = false
    const changedControlRecordList: IChangedControlRecord[] = []
    // 设置值
    const setValue = (elementList: IElement[], scopeAreaId?: string) => {
      walkControlElementList({
        elementList,
        scopeAreaId,
        isIncludeArea: true,
        isOnlyControlEntry: true,
        visitor: ({
          element,
          elementList,
          index,
          cursorIndex,
          scopeAreaId
        }): number | void => {
          // 获取设置值优先id、conceptId、areaId
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload,
            scopeAreaId,
            isIncludeScopeArea: true
          })
          if (!payloadItem) return
          matchedPayloadSet.add(payloadItem)
          changedControlRecordList.push({
            element,
            payload: payloadItem
          })
          if (this.isNestedControlValueElement(element)) {
            this.setNestedControlValue(element, payloadItem.value, elementList)
            isExistSet = true
            if (payloadItem.isSubmitHistory !== false) {
              isExistSubmitHistory = true
            }
            return
          }
          if (element.parentControlId) {
            isExistSet = true
            if (payloadItem.isSubmitHistory !== false) {
              isExistSubmitHistory = true
            }
            return this.setExpandedNestedControlValue(
              elementList,
              index,
              payloadItem.value
            )
          }
          const { value, isSubmitHistory = true } = payloadItem
          // 只要存在一次保存历史均记录
          isExistSet = true
          if (isSubmitHistory) {
            isExistSubmitHistory = true
          }
          // 当前控件结束索引
          const currentEndIndex = resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
          // 模拟光标选区上下文
          const fakeRange = {
            startIndex: index,
            endIndex: currentEndIndex - 2
          }
          const controlContext: IControlContext = {
            range: fakeRange,
            elementList
          }
          const controlRule: IControlRuleOption = {
            isIgnoreDisabledRule: true,
            isIgnoreDeletedRule: true
          }
          this.applyControlValueById(element, value, controlContext, controlRule)
          // 控件值变更事件
          this.emitControlContentChange({
            context: controlContext
          })
          // 模拟控件激活后销毁
          this.activeControl = null
          // 修改后控件结束索引
          return resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
        }
      })
    }
    // 销毁旧控件
    this.destroyControl({
      isEmitEvent: false
    })
    // 页眉、内容区、页脚同时处理
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      setValue(elementList)
    }
    this.applyCascadeControlOptions(changedControlRecordList)
    if (isExistSet) {
      // 不保存历史时需清空之前记录，避免还原
      if (!isExistSubmitHistory) {
        this.draw.getHistoryManager().recovery()
      }
      this.draw.render({
        isSubmitHistory: isExistSubmitHistory,
        isSetCursor: false
      })
    }
    return createControlBatchResult(payload, matchedPayloadSet)
  }
}
