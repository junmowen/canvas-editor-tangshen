import { ControlComponent } from '../../../../dataset/enum/Control'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { ZERO } from '../../../../dataset/constant/Common'
import { LIST_CONTEXT_ATTR, TITLE_CONTEXT_ATTR } from '../../../../dataset/constant/Element'
import { IElement } from '../../../../interface/Element'
import {
  IControl,
  IGetControlValueOption,
  IGetControlValueResult
} from '../../../../interface/Control'
import { omitObject } from '../../../../utils'
import { zipElementList } from '../../../../utils/elementZip'
import { getTextFromElementList } from '../../../../utils/elementText'
import { collectTextControlValueBlock, resolveControlCodeDisplayText } from './controlRead'
import { walkControlElementList } from './controlTraversal'
import { isControlIdentityMatched } from './controlMatch'
import { isChoiceControlType, isTextLikeControlType } from './controlType'

/** 控件内部访问契约，用于在拆分模块间共享受控能力。 */
type ControlInternal = Record<string, any>

declare module './Control' {
  interface Control {
    getValueById(payload: IGetControlValueOption): IGetControlValueResult
    getList(): IElement[]
  }
}

export const controlValueReadMethods = {
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

  getValueById(
    this: ControlInternal,
    payload: IGetControlValueOption
  ): IGetControlValueResult {
    const { id, conceptId, areaId, externalId, code } = payload
    const result: IGetControlValueResult = []
    if (
      !id &&
      !conceptId &&
      !areaId &&
      !externalId &&
      (code === undefined || code === null)
    ) return result
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

  getList(this: ControlInternal): IElement[] {
    const controlElementMap = new Map<string, IElement[]>()
    const collectControlElement = (element: IElement) => {
      const controlId = element.controlId
      if (!controlId) return
      const controlElementList = controlElementMap.get(controlId) || []
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
