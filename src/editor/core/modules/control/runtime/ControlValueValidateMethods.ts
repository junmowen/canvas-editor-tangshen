import { EditorZone } from '../../../../dataset/enum/Editor'
import { IElement } from '../../../../interface/Element'
import {
  IControlHighlight,
  IControlValidateOption,
  IControlValidateResult
} from '../../../../interface/Control'
import { collectTextControlValueBlock } from './controlRead'
import { walkControlElementList } from './controlTraversal'
import { isControlIdentityMatched } from './controlMatch'
import { isTextLikeControlType } from './controlType'
import {
  applyCrossValidateRules,
  hasControlValidateFilter,
  IControlValidateContext,
  mergeControlValidateResult,
  VALIDATE_HIGHLIGHT_SOURCE
} from './ControlValuePolicy'

/** 控件内部访问契约，用于在拆分模块间共享受控能力。 */
type ControlInternal = Record<string, any>

declare module './Control' {
  interface Control {
    validateById(payload?: IControlValidateOption): IControlValidateResult
    validateAsyncById(payload?: IControlValidateOption): Promise<IControlValidateResult>
  }
}

export const controlValueValidateMethods = {
  applyValidateHighlight(
    this: ControlInternal,
    result: IControlValidateResult,
    payload: IControlValidateOption
  ) {
    if (!payload.isApplyHighlight) return
    const currentHighlightList = this.controlSearch.getHighlightList() as IControlHighlight[]
    const businessHighlightList = currentHighlightList.filter(
      item => item.source !== VALIDATE_HIGHLIGHT_SOURCE
    )
    const validateHighlightList = result.failureList
      .filter(item => !!item.controlId)
      .map(item => ({
        id: item.controlId,
        source: VALIDATE_HIGHLIGHT_SOURCE,
        ruleList: [
          {
            keyword: item.value || '',
            isFullControl: true,
            backgroundColor: payload.highlightColor || '#ff4d4f',
            alpha: payload.highlightAlpha ?? 0.25
          }
        ]
      }))
    this.controlSearch.setHighlightList([
      ...businessHighlightList,
      ...validateHighlightList
    ])
    this.computeHighlightList()
    this.draw.refreshVisibleOverlay({
      isControlDirty: true
    })
  },

  validateById(
    this: ControlInternal,
    payload: IControlValidateOption = {}
  ): IControlValidateResult {
    const failureList: IControlValidateResult['failureList'] = []
    const controlContextList: IControlValidateContext[] = []
    const hasFilter = hasControlValidateFilter(payload)
    const validate = (
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
        visitor: ({ element, elementList, index, zone, scopeAreaId }): void => {
          const control = element.control!
          let value = this.getControlDisplayText(control) || null
          if (
            !this.isNestedControlValueElement(element) &&
            isTextLikeControlType(control.type)
          ) {
            value =
              collectTextControlValueBlock({
                elementList,
                startIndex: index,
                controlId: element.controlId!,
                controlType: control.type
              }).textControlValue || null
          }
          controlContextList.push({
            element,
            control,
            value,
            zone: zone!,
            scopeAreaId
          })
          if (
            hasFilter &&
            !isControlIdentityMatched({
              element,
              option: payload,
              scopeAreaId,
              isIncludeScopeArea: true
            })
          ) {
            return
          }
          const normalizedValue = value || ''
          if (control.required && !normalizedValue) {
            failureList.push({
              controlId: element.controlId,
              control,
              value,
              zone: zone!,
              reason: 'required',
              message: control.placeholder || '控件必填'
            })
          }
          const validateRules = control.validateRules || []
          for (let ruleIndex = 0; ruleIndex < validateRules.length; ruleIndex++) {
            const rule = validateRules[ruleIndex]
            if (!rule.pattern) continue
            let isPatternMatched = false
            try {
              isPatternMatched = new RegExp(rule.pattern).test(normalizedValue)
            } catch {
              isPatternMatched = false
            }
            if (!isPatternMatched) {
              failureList.push({
                controlId: element.controlId,
                control,
                value,
                zone: zone!,
                reason: 'pattern',
                message: rule.message || '控件格式不正确'
              })
            }
          }
        }
      })
    }
    for (const { zone, elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      validate(elementList, zone)
    }
    applyCrossValidateRules({
      failureList,
      controlContextList,
      option: payload,
      ruleList: this.options.controlCrossValidateRules || []
    })
    const result = {
      isValid: failureList.length === 0,
      failureList
    }
    this.applyValidateHighlight(result, payload)
    if (payload.isEmitEvent !== false) {
      this.listener.controlValidate?.(result)
      if (this.eventBus.isSubscribe('controlValidate')) {
        this.eventBus.emit('controlValidate', result)
      }
    }
    return result
  },

  async validateAsyncById(
    this: ControlInternal,
    payload: IControlValidateOption = {}
  ): Promise<IControlValidateResult> {
    const syncResult = this.validateById({
      ...payload,
      isEmitEvent: false,
      isApplyHighlight: false
    })
    const validator = this.options.controlValidator
    const asyncResult =
      typeof validator === 'function'
        ? await validator({
            result: syncResult,
            option: payload
          })
        : undefined
    const result = mergeControlValidateResult(syncResult, asyncResult)
    this.applyValidateHighlight(result, payload)
    if (payload.isEmitEvent !== false) {
      this.listener.controlValidate?.(result)
      if (this.eventBus.isSubscribe('controlValidate')) {
        this.eventBus.emit('controlValidate', result)
      }
    }
    return result
  }
}
