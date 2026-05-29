import { IElement } from '../../../../interface/Element'

/** 控件identity选项，用于约束调用方可传入的可选配置。 */
interface IControlIdentityOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 区域标识，用于关联控件或元素所在的编辑区域。 */
  areaId?: string
}

/** 控件identitymatch调用载荷，聚合执行该操作所需的输入数据。 */
interface IControlIdentityMatchPayload<T extends IControlIdentityOption> {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 匹配选项，用于限定本次控件或菜单处理规则。 */
  option: T
  /** 作用域区域标识，用于限定控件匹配和遍历范围。 */
  scopeAreaId?: string
  /** 是否包含作用域区域，用于判断控件匹配范围。 */
  isIncludeScopeArea?: boolean
}

/** find控件identity调用载荷，聚合执行该操作所需的输入数据。 */
interface IFindControlIdentityPayload<T extends IControlIdentityOption> {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 选项列表，保存可匹配或可展示的候选项。 */
  optionList: T[]
  /** 作用域区域标识，用于限定控件匹配和遍历范围。 */
  scopeAreaId?: string
  /** 是否包含作用域区域，用于判断控件匹配范围。 */
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
