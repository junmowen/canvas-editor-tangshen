import { IElement } from '../../../../interface/Element'
import {
  IControlBatchSetResult,
  ISetControlExtensionOption
} from '../../../../interface/Control'
import { resolveControlBlockEndIndex } from './controlScan'
import { walkControlElementList } from './controlTraversal'
import { findMatchedControlIdentity } from './controlMatch'
import { createControlBatchResult } from './ControlValuePolicy'

/** 控件内部访问契约，用于在拆分模块间共享受控能力。 */
type ControlInternal = Record<string, any>

declare module './Control' {
  interface Control {
    setExtensionListById(payload: ISetControlExtensionOption[]): IControlBatchSetResult<ISetControlExtensionOption>
  }
}

export const controlExtensionMethods = {
  setExtensionListById(
    this: ControlInternal,
    payload: ISetControlExtensionOption[]
  ): IControlBatchSetResult<ISetControlExtensionOption> {
    const matchedPayloadSet = new Set<ISetControlExtensionOption>()
    if (!payload.length) {
      return createControlBatchResult(payload, matchedPayloadSet)
    }
    const setExtension = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        visitor: ({ element, elementList, cursorIndex }): number | void => {
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload
          })
          if (!payloadItem) return
          matchedPayloadSet.add(payloadItem)
          const { extension } = payloadItem
          this.setControlProperties(
            {
              extension
            },
            {
              elementList,
              range: { startIndex: cursorIndex, endIndex: cursorIndex }
            }
          )
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
    return createControlBatchResult(payload, matchedPayloadSet)
  }
}
