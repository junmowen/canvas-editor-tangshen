import { ControlType } from '../../../dataset/enum/Control'
import { ElementType } from '../../../dataset/enum/Element'
import { IValueSet } from '../../../interface/Control'
import { IElement } from '../../../interface/Element'
import {
  getOoxmlAttribute,
  getOoxmlChildElement as getFirstChildElement,
  getOoxmlChildElements as getChildElements,
  isOoxmlElement
} from './OoxmlDom'

/** 内容控件导入上下文，由主文档解析器注入，避免运行时反向依赖。 */
export interface IOoxmlControlImportContext<TOption> {
  /** 解析内容控件内直接 run 子节点。 */
  parseRunElement: (runElement: Element, options: TOption) => IElement[]
  /** 解析内容控件内段落包裹结构。 */
  parseParagraphElement: (
    paragraphElement: Element,
    options: TOption
  ) => IElement[]
}

/** 支持按业务控件导入的控件类型，专用日期/勾选元素后续按独立模型扩展。 */
const IMPORTABLE_CONTROL_TYPE_SET = new Set<string>([
  ControlType.TEXT,
  ControlType.SELECT,
  ControlType.NUMBER
])

/** 解析内容控件 tag 中的 key=value 业务标识。 */
function parseOoxmlControlTagValue(tagValue: string | null | undefined) {
  const tagMap: Record<string, string> = {}
  ;(tagValue || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .forEach(part => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex <= 0) return
      const key = part.slice(0, separatorIndex)
      const value = part.slice(separatorIndex + 1)
      tagMap[key] = value
    })
  return tagMap
}

/** 判断 tag 中的 type 是否属于第一批可恢复的业务控件类型。 */
function isImportableOoxmlControlType(
  type: string | undefined
): type is ControlType.TEXT | ControlType.SELECT | ControlType.NUMBER {
  return Boolean(type && IMPORTABLE_CONTROL_TYPE_SET.has(type))
}

/** 从下拉内容控件属性中恢复外部初始化传入的候选项。 */
function parseOoxmlControlValueSets(
  structuredDocumentTagProperties: Element | undefined
): IValueSet[] {
  const optionContainer =
    getFirstChildElement(structuredDocumentTagProperties, 'dropDownList') ||
    getFirstChildElement(structuredDocumentTagProperties, 'comboBox')
  return getChildElements(optionContainer, 'listItem').reduce<IValueSet[]>(
    (valueSetList, item) => {
      const displayText = getOoxmlAttribute(item, 'displayText')
      const rawValue = getOoxmlAttribute(item, 'value')
      const value = displayText || rawValue
      const code = rawValue || displayText
      if (!value || !code) {
        return valueSetList
      }
      valueSetList.push({
        value,
        code
      })
      return valueSetList
    },
    []
  )
}

/** 解析内容控件显示内容，优先读取 sdtContent 下的 run，并支持段落包裹结构。 */
function parseOoxmlStructuredDocumentTagContent<TOption>(
  structuredDocumentTagElement: Element,
  options: TOption,
  context: IOoxmlControlImportContext<TOption>
) {
  const content = getFirstChildElement(
    structuredDocumentTagElement,
    'sdtContent'
  )
  const elementList: IElement[] = []
  for (const childElement of getChildElements(content)) {
    if (isOoxmlElement(childElement, 'r')) {
      elementList.push(...context.parseRunElement(childElement, options))
      continue
    }
    if (isOoxmlElement(childElement, 'p')) {
      elementList.push(...context.parseParagraphElement(childElement, options))
    }
  }
  return elementList
}

/** 解析日期内容控件，恢复日期 id、格式和当前显示值。 */
function parseOoxmlDateStructuredDocumentTag(
  properties: Element | undefined,
  tagMap: Record<string, string>,
  displayText: string
) {
  const dateElement = getFirstChildElement(properties, 'date')
  const dateFormat =
    tagMap.dateFormat ||
    getOoxmlAttribute(getFirstChildElement(dateElement, 'dateFormat'), 'val') ||
    undefined
  return [
    {
      type: ElementType.DATE,
      value: displayText,
      valueList: displayText ? [{ value: displayText }] : [],
      ...(tagMap.dateId ? { dateId: tagMap.dateId } : {}),
      ...(dateFormat ? { dateFormat } : {}),
      ...(tagMap.externalId ? { externalId: tagMap.externalId } : {})
    }
  ]
}

/** 解析复选框和单选框内容控件，恢复 checked/code/disabled 状态。 */
function parseOoxmlCheckableStructuredDocumentTag(
  tagMap: Record<string, string>,
  displayText: string
) {
  const isCheckbox = tagMap.type === ControlType.CHECKBOX
  const normalizedDisplayText = displayText.trim()
  const checkedSymbolSet = isCheckbox
    ? new Set(['☑', '☒', '✓', '✔'])
    : new Set(['◉', '●', '•'])
  const checked =
    tagMap.checked !== undefined
      ? tagMap.checked === 'true'
      : checkedSymbolSet.has(normalizedDisplayText)
  return [
    {
      type: isCheckbox ? ElementType.CHECKBOX : ElementType.RADIO,
      value: '',
      ...(isCheckbox
        ? {
            checkbox: {
              value: checked,
              ...(tagMap.code ? { code: tagMap.code } : {}),
              ...(tagMap.disabled === 'true' ? { disabled: true } : {})
            }
          }
        : {
            radio: {
              value: checked,
              ...(tagMap.code ? { code: tagMap.code } : {}),
              ...(tagMap.disabled === 'true' ? { disabled: true } : {})
            }
          })
    }
  ]
}

/** 解析业务内容控件，无法识别的 sdt 回退为普通内容，避免丢失正文。 */
export function parseOoxmlStructuredDocumentTagElement<TOption>(
  structuredDocumentTagElement: Element,
  options: TOption,
  context: IOoxmlControlImportContext<TOption>
) {
  const properties = getFirstChildElement(structuredDocumentTagElement, 'sdtPr')
  const tag = getFirstChildElement(properties, 'tag')
  const tagMap = parseOoxmlControlTagValue(getOoxmlAttribute(tag, 'val'))
  const controlType = tagMap.type
  const valueElementList = parseOoxmlStructuredDocumentTagContent(
    structuredDocumentTagElement,
    options,
    context
  )
  const displayText = valueElementList.map(element => element.value || '').join('')
  const isDateControl = Boolean(
    getFirstChildElement(properties, 'date') || tagMap.dateId || tagMap.dateFormat
  )

  if (isDateControl) {
    return parseOoxmlDateStructuredDocumentTag(properties, tagMap, displayText)
  }

  if (controlType === ControlType.CHECKBOX || controlType === ControlType.RADIO) {
    return parseOoxmlCheckableStructuredDocumentTag(tagMap, displayText)
  }

  // 仅恢复已知控件类型；其他未知 sdt 暂按普通内容导入，避免丢失正文。
  if (!isImportableOoxmlControlType(controlType)) {
    return valueElementList
  }

  const value = displayText ? [{ value: displayText }] : []
  return [
    {
      type: ElementType.CONTROL,
      value: displayText,
      ...(tagMap.controlId ? { controlId: tagMap.controlId } : {}),
      ...(tagMap.externalId ? { externalId: tagMap.externalId } : {}),
      control: {
        type: controlType,
        value,
        ...(tagMap.conceptId ? { conceptId: tagMap.conceptId } : {}),
        ...(tagMap.code !== undefined ? { code: tagMap.code } : {}),
        ...(tagMap.required === 'true' ? { required: true } : {}),
        ...(tagMap.disabled === 'true' ? { disabled: true } : {}),
        ...(controlType === ControlType.SELECT
          ? { valueSets: parseOoxmlControlValueSets(properties) }
          : {})
      }
    }
  ]
}
