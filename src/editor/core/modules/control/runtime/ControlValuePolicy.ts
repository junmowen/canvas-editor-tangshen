import { ZERO } from '../../../../dataset/constant/Common'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { IElement } from '../../../../interface/Element'
import {
  IControl,
  IControlBatchSetResult,
  IControlCrossValidateRule,
  IControlValidateOption,
  IControlValidateResult,
  ISetControlValueOption
} from '../../../../interface/Control'
import { getTextFromElementList } from '../../../../utils/elementText'
import { isControlIdentityMatched } from './controlMatch'

/** 控件校验高亮来源标识，用于与业务自定义高亮隔离。 */
export const VALIDATE_HIGHLIGHT_SOURCE = 'control-validate'

/** 控件校验上下文，用于同步校验和跨字段规则复用同一份真实显示值。 */
export interface IControlValidateContext {
  /** 控件入口元素。 */
  element: IElement
  /** 控件配置对象。 */
  control: IControl
  /** 当前控件显示值。 */
  value: string | null
  /** 控件所在编辑区域。 */
  zone: EditorZone
  /** 当前控件所属区域 id。 */
  scopeAreaId?: string
}

/** 创建控件批量操作的结果对象。 */
export function createControlBatchResult<TOption>(
  payload: TOption[],
  matchedPayloadSet: Set<TOption>
): IControlBatchSetResult<TOption> {
  return {
    successCount: matchedPayloadSet.size,
    failureList: payload
      .filter(item => !matchedPayloadSet.has(item))
      .map(item => ({
        option: item,
        reason: 'not_found',
        message: '未找到匹配的控件'
      }))
  }
}

/** 读取控件当前值，级联映射优先使用本次 API 写入值，再回退到业务 code 和显示文本。 */
export function getCascadeParentValue(payload: {
  /** 父控件配置。 */
  control: IControl
  /** 本次写入载荷。 */
  option: ISetControlValueOption
}): string | null {
  const { control, option } = payload
  if (!Array.isArray(option.value) && option.value !== null) {
    return String(option.value)
  }
  if (control.code !== undefined && control.code !== null) {
    return String(control.code)
  }
  if (Array.isArray(control.value) && control.value.length) {
    return getTextFromElementList(control.value)
      .replace(new RegExp(`${ZERO}`, 'g'), '')
      .trim()
  }
  return null
}

/** 判断子控件级联配置是否匹配当前父控件。 */
export function isCascadeParentMatched(payload: {
  /** 子控件入口元素。 */
  childElement: IElement
  /** 父控件入口元素。 */
  parentElement: IElement
}) {
  const { childElement, parentElement } = payload
  const cascade = childElement.control?.cascade
  if (!cascade) return false
  return (
    (!!cascade.parentId && parentElement.controlId === cascade.parentId) ||
    (!!cascade.parentConceptId &&
      parentElement.control?.conceptId === cascade.parentConceptId) ||
    (!!cascade.parentExternalId &&
      parentElement.externalId === cascade.parentExternalId) ||
    (cascade.parentCode !== undefined &&
      cascade.parentCode !== null &&
      parentElement.control?.code !== undefined &&
      parentElement.control.code !== null &&
      String(parentElement.control.code) === String(cascade.parentCode))
  )
}

/** 判断校验选项是否声明了控件匹配条件。 */
export function hasControlValidateFilter(payload?: IControlValidateOption): boolean {
  return !!(
    payload?.id ||
    payload?.conceptId ||
    payload?.areaId ||
    payload?.externalId ||
    (payload?.code !== undefined && payload.code !== null)
  )
}

/** 判断跨字段规则依赖条件是否满足。 */
function isCrossValidateDependencyMatched(
  rule: IControlCrossValidateRule,
  dependencyValue: string | null
) {
  if (rule.dependencyValue === undefined) {
    return !!dependencyValue
  }
  return String(dependencyValue ?? '') === String(rule.dependencyValue ?? '')
}

/** 获取跨字段规则默认提示。 */
function getCrossValidateMessage(rule: IControlCrossValidateRule) {
  if (rule.message) return rule.message
  switch (rule.type) {
    case 'equals':
      return '控件值需要与依赖控件一致'
    case 'notEquals':
      return '控件值不能与依赖控件一致'
    case 'requiredWhen':
      return '当前条件下控件必填'
    case 'emptyWhen':
      return '当前条件下控件必须为空'
    default:
      return '跨字段校验未通过'
  }
}

/** 执行声明式跨字段控件校验。 */
export function applyCrossValidateRules(payload: {
  /** 校验失败列表。 */
  failureList: IControlValidateResult['failureList']
  /** 已扫描到的控件上下文列表。 */
  controlContextList: IControlValidateContext[]
  /** 本次校验选项。 */
  option: IControlValidateOption
  /** 跨字段规则列表。 */
  ruleList: IControlCrossValidateRule[]
}) {
  const { failureList, controlContextList, option, ruleList } = payload
  if (!ruleList.length) return
  const hasFilter = hasControlValidateFilter(option)
  for (const rule of ruleList) {
    const target = controlContextList.find(context =>
      isControlIdentityMatched({
        element: context.element,
        option: rule.target,
        scopeAreaId: context.scopeAreaId,
        isIncludeScopeArea: true
      })
    )
    if (!target) continue
    if (
      hasFilter &&
      !isControlIdentityMatched({
        element: target.element,
        option,
        scopeAreaId: target.scopeAreaId,
        isIncludeScopeArea: true
      })
    ) {
      continue
    }
    const dependency = controlContextList.find(context =>
      isControlIdentityMatched({
        element: context.element,
        option: rule.dependency,
        scopeAreaId: context.scopeAreaId,
        isIncludeScopeArea: true
      })
    )
    if (!dependency) continue
    const targetValue = target.value || ''
    const dependencyValue = dependency.value || ''
    const dependencyMatched = isCrossValidateDependencyMatched(
      rule,
      dependency.value
    )
    const isFailed =
      (rule.type === 'equals' && targetValue !== dependencyValue) ||
      (rule.type === 'notEquals' && targetValue === dependencyValue) ||
      (rule.type === 'requiredWhen' && dependencyMatched && !targetValue) ||
      (rule.type === 'emptyWhen' && dependencyMatched && !!targetValue)
    if (!isFailed) continue
    failureList.push({
      controlId: target.element.controlId,
      control: target.control,
      value: target.value,
      zone: target.zone,
      reason: 'cross_field',
      message: getCrossValidateMessage(rule)
    })
  }
}

/** 合并同步校验和业务异步校验结果。 */
export function mergeControlValidateResult(
  baseResult: IControlValidateResult,
  extraResult?: IControlValidateResult | void
): IControlValidateResult {
  if (!extraResult) return baseResult
  const failureList = [
    ...baseResult.failureList,
    ...extraResult.failureList
  ]
  return {
    isValid: baseResult.isValid && extraResult.isValid && !failureList.length,
    failureList
  }
}
