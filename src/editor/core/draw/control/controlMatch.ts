import { IElement } from '../../../interface/Element'

interface IControlIdentityOption {
  id?: string
  conceptId?: string
  areaId?: string
}

interface IControlIdentityMatchPayload<T extends IControlIdentityOption> {
  element: IElement
  option: T
  scopeAreaId?: string
  isIncludeScopeArea?: boolean
}

interface IFindControlIdentityPayload<T extends IControlIdentityOption> {
  element: IElement
  optionList: T[]
  scopeAreaId?: string
  isIncludeScopeArea?: boolean
}

export function isControlIdentityMatched<T extends IControlIdentityOption>(
  payload: IControlIdentityMatchPayload<T>
): boolean {
  const { element, option, scopeAreaId, isIncludeScopeArea = false } = payload
  return (
    (!!option.id && element.controlId === option.id) ||
    (!!option.conceptId && element.control?.conceptId === option.conceptId) ||
    (!!option.areaId &&
      (element.areaId === option.areaId ||
        (isIncludeScopeArea && scopeAreaId === option.areaId)))
  )
}

export function findMatchedControlIdentity<T extends IControlIdentityOption>(
  payload: IFindControlIdentityPayload<T>
): T | undefined {
  const { optionList, ...matchPayload } = payload
  return optionList.find(option =>
    isControlIdentityMatched({
      ...matchPayload,
      option
    })
  )
}
