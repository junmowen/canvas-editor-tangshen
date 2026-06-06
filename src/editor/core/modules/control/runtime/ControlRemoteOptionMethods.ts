import { EditorZone } from '../../../../dataset/enum/Editor'
import { IElement } from '../../../../interface/Element'
import {
  IControlRemoteOptionLoadBatchResult,
  IControlRemoteOptionLoadOption
} from '../../../../interface/Control'
import { deepClone } from '../../../../utils'
import { walkControlElementList } from './controlTraversal'
import { findMatchedControlIdentity } from './controlMatch'
import { isChoiceControlType } from './controlType'

/** 控件内部访问契约，用于在拆分模块间共享受控能力。 */
type ControlInternal = Record<string, any>

/** 远程选项加载命中的控件记录，用于延迟调用业务加载器。 */
interface IRemoteOptionLoadTarget {
  /** 控件入口元素。 */
  element: IElement
  /** 控件所在元素列表。 */
  elementList: IElement[]
  /** 控件入口索引。 */
  index: number
  /** 所在编辑区域。 */
  zone: EditorZone
  /** 本次加载选项。 */
  option: IControlRemoteOptionLoadOption
}

declare module './Control' {
  interface Control {
    loadRemoteOptionsById(payload: IControlRemoteOptionLoadOption[]): Promise<IControlRemoteOptionLoadBatchResult>
  }
}

export const controlRemoteOptionMethods = {
  async loadRemoteOptionsById(
    this: ControlInternal,
    payload: IControlRemoteOptionLoadOption[]
  ): Promise<IControlRemoteOptionLoadBatchResult> {
    const matchedPayloadSet = new Set<IControlRemoteOptionLoadOption>()
    const targetList: IRemoteOptionLoadTarget[] = []
    const failureList: IControlRemoteOptionLoadBatchResult['failureList'] = []
    if (!payload.length) {
      return {
        successCount: 0,
        failureList
      }
    }
    const collectTarget = (
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
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload,
            scopeAreaId,
            isIncludeScopeArea: true
          })
          if (!payloadItem) return
          matchedPayloadSet.add(payloadItem)
          if (!isChoiceControlType(element.control!.type)) {
            failureList.push({
              option: payloadItem,
              reason: 'unsupported',
              message: '远程选项只支持选择类控件',
              controlId: element.controlId
            })
            return
          }
          targetList.push({
            element,
            elementList,
            index,
            zone: zone!,
            option: payloadItem
          })
        }
      })
    }
    for (const { zone, elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      collectTarget(elementList, zone)
    }
    payload
      .filter(item => !matchedPayloadSet.has(item))
      .forEach(item => {
        failureList.push({
          option: item,
          reason: 'not_found',
          message: '未找到匹配的控件'
        })
      })

    let successCount = 0
    let isExistUpdate = false
    let isExistSubmitHistory = false
    const loader = this.options.controlRemoteOptionLoader
    for (const target of targetList) {
      const { element, elementList, index, zone, option } = target
      const control = element.control!
      const remoteBase = control.remote || {}
      const nextSource = option.source ?? remoteBase.source
      const nextRequestId = option.requestId ?? remoteBase.requestId
      control.remote = {
        ...remoteBase,
        loading: true,
        error: null,
        source: nextSource,
        requestId: nextRequestId
      }
      isExistUpdate = true
      if (option.isSubmitHistory !== false) {
        isExistSubmitHistory = true
      }
      try {
        const value =
          control.code !== undefined && control.code !== null
            ? String(control.code)
            : this.getControlDisplayText(control) || null
        const loadResult = await loader({
          option,
          controlId: element.controlId,
          control,
          value,
          zone
        })
        if (
          nextRequestId &&
          control.remote?.requestId &&
          control.remote.requestId !== nextRequestId
        ) {
          continue
        }
        control.valueSets = deepClone(loadResult.valueSets)
        control.remote = {
          ...control.remote,
          ...loadResult.remote,
          loading: loadResult.remote?.loading ?? false,
          error: loadResult.remote?.error ?? null,
          source: loadResult.remote?.source ?? nextSource,
          requestId: loadResult.remote?.requestId ?? nextRequestId
        }
        if (this.isNestedControlValueElement(element)) {
          this.setNestedControlValue(element, control.code ?? null, elementList)
        } else if (control.code !== undefined && control.code !== null) {
          this.applyControlValueById(
            element,
            String(control.code),
            {
              range: {
                startIndex: index,
                endIndex: index
              },
              elementList
            },
            {
              isIgnoreDisabledRule: true,
              isIgnoreDeletedRule: true
            }
          )
          this.activeControl = null
        }
        successCount++
      } catch (error) {
        const message =
          error && typeof (error as { message?: unknown }).message === 'string'
            ? String((error as { message: string }).message)
            : '远程选项加载失败'
        control.remote = {
          ...control.remote,
          loading: false,
          error: message,
          source: nextSource,
          requestId: nextRequestId
        }
        failureList.push({
          option,
          reason: 'load_failed',
          message,
          controlId: element.controlId
        })
      }
    }
    if (isExistUpdate) {
      if (!isExistSubmitHistory) {
        this.draw.getHistoryManager().recovery()
      }
      this.draw.render({
        isSubmitHistory: isExistSubmitHistory,
        isSetCursor: false
      })
    }
    return {
      successCount,
      failureList
    }
  }
}
