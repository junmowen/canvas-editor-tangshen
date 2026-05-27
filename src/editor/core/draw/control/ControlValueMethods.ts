import { ControlComponent, ControlType } from '../../../dataset/enum/Control'
import { EditorZone } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { CONTROL_STYLE_ATTR, LIST_CONTEXT_ATTR, TITLE_CONTEXT_ATTR } from '../../../dataset/constant/Element'
import { ZERO } from '../../../dataset/constant/Common'
import { IEditorData } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import {
  IControl,
  IControlContext,
  IControlInstance,
  IControlRuleOption,
  IGetControlValueOption,
  IGetControlValueResult,
  ISetControlExtensionOption,
  ISetControlProperties,
  ISetControlValueOption
} from '../../../interface/Control'
import { deepClone, isArray, isString, omitObject, pickObject } from '../../../utils'
import {
  formatElementList,
  getControlInlineContentText,
  getControlInlineText,
  getTextFromElementList,
  zipElementList
} from '../../../utils/element'
import { CheckboxControl } from './checkbox/CheckboxControl'
import { RadioControl } from './radio/RadioControl'
import { SelectControl } from './select/SelectControl'
import { TextControl } from './text/TextControl'
import { DateControl } from './date/DateControl'
import { NumberControl } from './number/NumberControl'
import { collectTextControlValueBlock, resolveControlCodeDisplayText } from './controlRead'
import { resolveControlBlockEndIndex } from './controlScan'
import { createExpandedNestedControlValueElementList } from './controlNested'
import { walkControlElementList } from './controlTraversal'
import { findMatchedControlIdentity, isControlIdentityMatched } from './controlMatch'
import { isChoiceControlType, isTextLikeControlType } from './controlType'
import type { Control } from './Control'

type ControlInternal = Record<string, any>

interface ITextLikeControlInstance extends IControlInstance {
  setValue(
    data: IElement[],
    context?: IControlContext,
    options?: IControlRuleOption
  ): number
  clearValue(context?: IControlContext, options?: IControlRuleOption): number
}

interface IChoiceControlInstance extends IControlInstance {
  setSelect(
    value: string[] | string,
    context?: IControlContext,
    options?: IControlRuleOption
  ): number | void
}

declare module './Control' {
  interface Control {
    getValueById(payload: IGetControlValueOption): IGetControlValueResult
    setValueListById(payload: ISetControlValueOption[]): void
    setExtensionListById(payload: ISetControlExtensionOption[]): void
    setPropertiesListById(payload: ISetControlProperties[]): void
    getList(): IElement[]
  }
}

const controlValueMethods = {
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

  getNestedControlValueResult(
    this: ControlInternal,
    element: IElement,
    zone: EditorZone
  ): IGetControlValueResult[number] {
    const control = element.control!
    const text = this.getControlDisplayText(control)
    const result: IGetControlValueResult[number] = {
      ...control,
      zone,
      value: text || null,
      innerText: text || null
    }
    if (isTextLikeControlType(control.type)) {
      result.elementList = Array.isArray(control.value)
        ? zipElementList(control.value)
        : []
    }
    return result
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

  getIsOnlyNestedControlValue(
    this: ControlInternal,
    element: IElement,
    elementList?: IElement[]
  ): boolean {
    if (!elementList || !element.controlId) return false
    return (
      elementList.filter(
        item =>
          item.controlId === element.controlId &&
          item.controlComponent === ControlComponent.VALUE
      ).length === 1
    )
  },

  getControlDisplayText(this: ControlInternal, control: IControl): string {
    if (Array.isArray(control.value) && control.value.length) {
      return getTextFromElementList(control.value)
        .replace(new RegExp(`${ZERO}`, 'g'), '')
        .trim()
    }
    if (isChoiceControlType(control.type)) {
      return resolveControlCodeDisplayText({
        code: control.code,
        valueSets: control.valueSets,
        delimiter: control.multiSelectDelimiter || '、'
      })
    }
    return ''
  },

  getValueById(this: ControlInternal, payload: IGetControlValueOption): IGetControlValueResult {
    const { id, conceptId, areaId } = payload
    const result: IGetControlValueResult = []
    if (!id && !conceptId && !areaId) return result
    const getValue = (
      elementList: IElement[],
      zone: EditorZone,
      scopeAreaId?: string
    ) => {
      walkControlElementList({
        elementList,
        zone,
        scopeAreaId,
        isIncludeArea: true,
        isOnlyControlEntry: true,
        visitor: ({
          element,
          elementList,
          index,
          zone,
          scopeAreaId
        }): number | void => {
          const control = element.control!
          if (
            !isControlIdentityMatched({
              element,
              option: payload,
              scopeAreaId,
              isIncludeScopeArea: true
            })
          ) {
            return
          }
          if (this.isNestedControlValueElement(element)) {
            result.push(this.getNestedControlValueResult(element, zone!))
            return
          }
          const { type, code, valueSets } = control
          if (isTextLikeControlType(type)) {
            const {
              textControlValue,
              textControlElementList,
              endIndex
            } = collectTextControlValueBlock({
              elementList,
              startIndex: index,
              controlId: element.controlId!,
              controlType: type
            })
            result.push({
              ...control,
              zone: zone!,
              value: textControlValue || null,
              innerText: textControlValue || null,
              elementList: zipElementList(textControlElementList)
            })
            return endIndex
          } else if (isChoiceControlType(type)) {
            const innerText = resolveControlCodeDisplayText({
              code,
              valueSets
            })
            result.push({
              ...control,
              zone: zone!,
              value:
                code !== undefined && code !== null ? String(code) || null : null,
              innerText: innerText || null
            })
          }
        }
      })
    }
    for (const { zone, elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      getValue(elementList, zone)
    }
    return result
  },

  setValueListById(this: ControlInternal, payload: ISetControlValueOption[]) {
    if (!payload.length) return
    let isExistSet = false
    let isExistSubmitHistory = false
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
  },

  setExtensionListById(this: ControlInternal, payload: ISetControlExtensionOption[]) {
    if (!payload.length) return
    const setExtension = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        visitor: ({ element, elementList, cursorIndex }): number | void => {
          // 获取设置值优先id、conceptId、areaId
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload
          })
          if (!payloadItem) return
          const { extension } = payloadItem
          // 设置值
          this.setControlProperties(
            {
              extension
            },
            {
              elementList,
              range: { startIndex: cursorIndex, endIndex: cursorIndex }
            }
          )
          // 修改后控件结束索引
          return resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
        }
      })
    }
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      setExtension(elementList)
    }
  },

  setPropertiesListById(this: ControlInternal, payload: ISetControlProperties[]) {
    if (!payload.length) return
    let isExistUpdate = false
    let isExistSubmitHistory = false
    const setProperties = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        visitor: ({ element, elementList, index, cursorIndex }): number | void => {
          const control = element.control!
          // 获取设置值优先id、conceptId、areaId
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload
          })
          if (!payloadItem) return
          const { properties, isSubmitHistory = true } = payloadItem
          isExistUpdate = true
          if (isSubmitHistory) {
            isExistSubmitHistory = true
          }
          // 设置属性
          this.setControlProperties(
            {
              ...control,
              ...properties,
              value: control.value
            },
            {
              elementList,
              range: { startIndex: cursorIndex, endIndex: cursorIndex }
            }
          )
          // 控件默认样式
          const controlStartIndex = index
          CONTROL_STYLE_ATTR.forEach(key => {
            const controlStyleProperty = properties[key]
            if (controlStyleProperty !== undefined) {
              let styleIndex = controlStartIndex
              while (styleIndex < elementList.length) {
                const styleElement = elementList[styleIndex]
                if (styleElement.controlId !== element.controlId) break
                Reflect.set(styleElement, key, controlStyleProperty)
                styleIndex++
              }
            }
          })
          // 修改后控件结束索引
          return resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
        }
      })
    }
    // 页眉页脚正文启动搜索
    const pageComponentData: IEditorData = this.draw
      .getObjectResolver()
      .getOriginalEditorData()
    for (const key in pageComponentData) {
      const elementList = pageComponentData[<keyof IEditorData>key]!
      setProperties(elementList)
    }
    if (!isExistUpdate) return
    // 强制更新
    for (const key in pageComponentData) {
      const pageComponentKey = <keyof IEditorData>key
      const elementList = zipElementList(pageComponentData[pageComponentKey]!, {
        isClassifyArea: true,
        extraPickAttrs: ['id']
      })
      pageComponentData[pageComponentKey] = elementList
      formatElementList(elementList, {
        editorOptions: this.options,
        isForceCompensation: true
      })
    }
    this.draw.setEditorData(pageComponentData)
    // 不保存历史时需清空之前记录，避免还原
    if (!isExistSubmitHistory) {
      this.draw.getHistoryManager().recovery()
    }
    this.draw.render({
      isSubmitHistory: isExistSubmitHistory,
      isSetCursor: false
    })
  },

  getList(this: ControlInternal): IElement[] {
    const controlElementMap = new Map<string, IElement[]>()
    const collectControlElement = (element: IElement) => {
      const controlId = element.controlId
      if (!controlId) return
      const controlElementList = controlElementMap.get(controlId) || []
      // 移除控件所在标题及列表上下文信息
      const controlElement = omitObject(element, [
        ...TITLE_CONTEXT_ATTR,
        ...LIST_CONTEXT_ATTR
      ])
      controlElementList.push(controlElement)
      controlElementMap.set(controlId, controlElementList)
    }
    const getControlElementList = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        isRequireControl: false,
        visitor: ({ element }) => {
          collectControlElement(element)
        }
      })
    }
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      getControlElementList(elementList)
    }
    const result: IElement[] = []
    controlElementMap.forEach(elementList => {
      const controlElement = zipElementList(elementList, {
        extraPickAttrs: ['controlId']
      })[0]
      if (controlElement) {
        result.push(controlElement)
      }
    })
    return result
  }
}

export function installControlValueMethods(ControlClass: typeof Control) {
  Object.assign(ControlClass.prototype, controlValueMethods)
}
