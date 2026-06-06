import { CONTROL_STYLE_ATTR } from '../../../../dataset/constant/Element'
import { IRuntimeEditorData } from '../../../../interface/Editor'
import { IElement } from '../../../../interface/Element'
import {
  IControlBatchSetResult,
  ISetControlProperties
} from '../../../../interface/Control'
import { zipElementList } from '../../../../utils/elementZip'
import { formatElementList } from '../../../../utils/elementFormat'
import { resolveControlBlockEndIndex } from './controlScan'
import { walkControlElementList } from './controlTraversal'
import { findMatchedControlIdentity } from './controlMatch'
import { createControlBatchResult } from './ControlValuePolicy'

/** 控件内部访问契约，用于在拆分模块间共享受控能力。 */
type ControlInternal = Record<string, any>

declare module './Control' {
  interface Control {
    setPropertiesListById(payload: ISetControlProperties[]): IControlBatchSetResult<ISetControlProperties>
  }
}

export const controlPropertiesMethods = {
  setPropertiesListById(
    this: ControlInternal,
    payload: ISetControlProperties[]
  ): IControlBatchSetResult<ISetControlProperties> {
    const matchedPayloadSet = new Set<ISetControlProperties>()
    if (!payload.length) {
      return createControlBatchResult(payload, matchedPayloadSet)
    }
    let isExistUpdate = false
    let isExistSubmitHistory = false
    const setProperties = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        visitor: ({ element, elementList, index, cursorIndex }): number | void => {
          const control = element.control!
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload
          })
          if (!payloadItem) return
          matchedPayloadSet.add(payloadItem)
          const { properties, isSubmitHistory = true } = payloadItem
          isExistUpdate = true
          if (isSubmitHistory) {
            isExistSubmitHistory = true
          }
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
          return resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
        }
      })
    }
    const pageComponentData: IRuntimeEditorData = this.draw
      .getObjectResolver()
      .getOriginalEditorData()
    const pageComponentElementList = [
      ...(pageComponentData.headerPageScopes?.map(
        scopeData => scopeData.elementList
      ) || []),
      pageComponentData.main,
      ...(pageComponentData.footerPageScopes?.map(
        scopeData => scopeData.elementList
      ) || [])
    ]
    pageComponentElementList.forEach(setProperties)
    if (!isExistUpdate) {
      return createControlBatchResult(payload, matchedPayloadSet)
    }
    pageComponentData.headerPageScopes = pageComponentData.headerPageScopes?.map(
      scopeData => ({
        pageScope: scopeData.pageScope,
        elementList: zipElementList(scopeData.elementList, {
          extraPickAttrs: ['id']
        })
      })
    )
    pageComponentData.main = zipElementList(pageComponentData.main, {
      isClassifyArea: true,
      extraPickAttrs: ['id']
    })
    pageComponentData.footerPageScopes = pageComponentData.footerPageScopes?.map(
      scopeData => ({
        pageScope: scopeData.pageScope,
        elementList: zipElementList(scopeData.elementList, {
          extraPickAttrs: ['id']
        })
      })
    )
    ;[
      ...(pageComponentData.headerPageScopes?.map(
        scopeData => scopeData.elementList
      ) || []),
      pageComponentData.main,
      ...(pageComponentData.footerPageScopes?.map(
        scopeData => scopeData.elementList
      ) || [])
    ].forEach(elementList => {
      formatElementList(elementList, {
        editorOptions: this.options,
        isForceCompensation: true
      })
    })
    this.draw.setEditorData(pageComponentData)
    if (!isExistSubmitHistory) {
      this.draw.getHistoryManager().recovery()
    }
    this.draw.render({
      isSubmitHistory: isExistSubmitHistory,
      isSetCursor: false
    })
    return createControlBatchResult(payload, matchedPayloadSet)
  }
}
