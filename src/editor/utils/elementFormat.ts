import { deepClone, getUUID, pickObject, splitText } from '.'
import { LaTexParticle } from '../core/draw/particle/latex/LaTexParticle'
import { ZERO } from '../dataset/constant/Common'
import {
  CONTROL_STYLE_ATTR,
  EDITOR_ELEMENT_CONTEXT_ATTR,
  EDITOR_ROW_ATTR,
  TEXTLIKE_ELEMENT_TYPE
} from '../dataset/constant/Element'
import { START_LINE_BREAK_REG } from '../dataset/constant/Regular'
import { titleSizeMapping } from '../dataset/constant/Title'
import { ControlComponent, ControlType } from '../dataset/enum/Control'
import { PaperDirection } from '../dataset/enum/Editor'
import { ElementType } from '../dataset/enum/Element'
import { DeepRequired } from '../interface/Common'
import { IEditorOption } from '../interface/Editor'
import { IElement } from '../interface/Element'
import {
  appendControlValueSetText,
  createControlValueStyleList,
  getControlInlineContentText
} from './elementControl'
import { isTextLikeElement } from './elementLayout'

/**
 * 元素格式化模块。
 *
 * 负责把外部输入的元素补齐为编辑器内部规范结构，包括表格、控件、区域、列表、图片、LaTeX 等。
 */
export function unzipElementList(elementList: IElement[]): IElement[] {
  const result: IElement[] = []
  for (let v = 0; v < elementList.length; v++) {
    const valueItem = elementList[v]
    const textList = splitText(valueItem.value)
    for (let d = 0; d < textList.length; d++) {
      result.push({ ...valueItem, value: textList[d] })
    }
  }
  return result
}

interface IFormatElementListOption {
  isHandleFirstElement?: boolean // 根据上下文确定首字符处理逻辑（处理首字符补偿）
  isForceCompensation?: boolean // 强制补偿字符
  isFromControlValue?: boolean // 控件值内部格式化
  parentControlId?: string // 父级控件值上下文
  editorOptions: DeepRequired<IEditorOption>
}

export function formatElementList(
  elementList: IElement[],
  options: IFormatElementListOption
) {
  const {
    isHandleFirstElement = true,
    isForceCompensation = false,
    isFromControlValue = false,
    parentControlId,
    editorOptions
  } = options
  const startElement = elementList[0]
  // 非首字符零宽节点文本元素则补偿-列表元素内部会补偿此处忽略
  if (
    (isForceCompensation && startElement?.value !== ZERO) ||
    (!isForceCompensation &&
      isHandleFirstElement &&
      startElement?.type !== ElementType.LIST &&
      ((startElement?.type && startElement.type !== ElementType.TEXT) ||
        !START_LINE_BREAK_REG.test(startElement?.value)))
  ) {
    elementList.unshift({
      value: ZERO
    })
  }
  let i = 0
  while (i < elementList.length) {
    let el = elementList[i]
    if (
      el.type === ElementType.CONTROL &&
      el.controlComponent === ControlComponent.VALUE
    ) {
      i++
      continue
    }
    // 优先处理虚拟元素
    if (el.type === ElementType.TITLE) {
      // 移除父节点
      elementList.splice(i, 1)
      // 格式化元素
      const valueList = el.valueList || []
      formatElementList(valueList, {
        ...options,
        isHandleFirstElement: false,
        isForceCompensation: false
      })
      // 追加节点
      if (valueList.length) {
        const titleId = el.titleId || getUUID()
        const titleOptions = editorOptions.title
        for (let v = 0; v < valueList.length; v++) {
          const value = valueList[v]
          value.title = el.title
          if (el.level) {
            value.titleId = titleId
            value.level = el.level
          }
          // 文本型元素设置字体及加粗
          if (isTextLikeElement(value)) {
            if (!value.size) {
              value.size = titleOptions[titleSizeMapping[value.level!]]
            }
            if (value.bold === undefined) {
              value.bold = true
            }
          }
          elementList.splice(i, 0, value)
          i++
        }
      }
      i--
    } else if (el.type === ElementType.LIST) {
      // 移除父节点
      elementList.splice(i, 1)
      // 格式化元素
      const valueList = el.valueList || []
      formatElementList(valueList, {
        ...options,
        isHandleFirstElement: true,
        isForceCompensation: false
      })
      // 追加节点
      if (valueList.length) {
        const listId = getUUID()
        for (let v = 0; v < valueList.length; v++) {
          const value = valueList[v]
          value.listId = listId
          value.listType = el.listType
          value.listStyle = el.listStyle
          value.listLevel = value.listLevel ?? el.listLevel ?? 0
          value.extension = value.extension ?? el.extension
          value.externalId = value.externalId ?? el.externalId
          elementList.splice(i, 0, value)
          i++
        }
      }
      i--
    } else if (el.type === ElementType.AREA) {
      // 移除父节点
      elementList.splice(i, 1)
      // 格式化元素
      const valueList = el?.valueList || []
      formatElementList(valueList, {
        ...options,
        isHandleFirstElement: true,
        isForceCompensation: true
      })
      if (valueList.length) {
        const areaId = getUUID()
        for (let v = 0; v < valueList.length; v++) {
          const value = valueList[v]
          value.areaId = el.areaId || areaId
          value.area = el.area
          value.areaIndex = v
          if (value.type === ElementType.TABLE) {
            const trList = value.trList!
            for (let r = 0; r < trList.length; r++) {
              const tr = trList[r]
              for (let d = 0; d < tr.tdList.length; d++) {
                const td = tr.tdList[d]
                const tdValueList = td.value
                for (let t = 0; t < tdValueList.length; t++) {
                  const tdValue = tdValueList[t]
                  tdValue.areaId = el.areaId || areaId
                  tdValue.area = el.area
                }
              }
            }
          }
          elementList.splice(i, 0, value)
          i++
        }
      }
      i--
    } else if (el.type === ElementType.TABLE) {
      const tableId = el.id || getUUID()
      el.id = tableId
      if (el.trList) {
        const { defaultTrMinHeight } = editorOptions.table
        if (!el.colgroup?.length) {
          const colCount = Math.max(
            ...el.trList.map(tr =>
              tr.tdList.reduce((sum, td) => sum + (td.colspan || 1), 0)
            )
          )
          if (colCount > 0) {
            const margins =
              editorOptions.paperDirection === PaperDirection.VERTICAL
                ? editorOptions.margins
                : [
                    editorOptions.margins[1],
                    editorOptions.margins[2],
                    editorOptions.margins[3],
                    editorOptions.margins[0]
                  ]
            const pageWidth =
              editorOptions.paperDirection === PaperDirection.VERTICAL
                ? editorOptions.width
                : editorOptions.height
            const colWidth = (pageWidth - margins[1] - margins[3]) / colCount
            el.colgroup = Array.from({ length: colCount }, () => ({
              width: colWidth
            }))
          }
        }
        for (let t = 0; t < el.trList.length; t++) {
          const tr = el.trList[t]
          const trId = tr.id || getUUID()
          tr.id = trId
          const minHeight = tr.minHeight ?? tr.height ?? defaultTrMinHeight
          tr.minHeight = minHeight
          if (tr.height < minHeight) {
            tr.height = minHeight
          }
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const tdId = td.id || getUUID()
            td.id = tdId
            formatElementList(td.value, {
              ...options,
              isHandleFirstElement: true,
              isForceCompensation: true
            })
            // 首字符字体大小默认使用首个字符元素字体大小
            if (
              !td.value[0].size &&
              td.value[1]?.size &&
              isTextLikeElement(td.value[1])
            ) {
              td.value[0].size = td.value[1].size
            }
            for (let v = 0; v < td.value.length; v++) {
              const value = td.value[v]
              value.tdId = tdId
              value.trId = trId
              value.tableId = tableId
            }
          }
        }
      }
    } else if (el.type === ElementType.HYPERLINK) {
      // 移除父节点
      elementList.splice(i, 1)
      // 元素展开
      const valueList = unzipElementList(el.valueList || [])
      // 追加节点
      if (valueList.length) {
        const hyperlinkId = getUUID()
        for (let v = 0; v < valueList.length; v++) {
          const value = valueList[v]
          value.type = el.type
          value.url = el.url
          value.hyperlinkId = hyperlinkId
          elementList.splice(i, 0, value)
          i++
        }
      }
      i--
    } else if (el.type === ElementType.DATE) {
      // 移除父节点
      elementList.splice(i, 1)
      // 元素展开
      const valueList = unzipElementList(el.valueList || [])
      // 追加节点
      if (valueList.length) {
        const dateId = getUUID()
        for (let v = 0; v < valueList.length; v++) {
          const value = valueList[v]
          value.type = el.type
          value.dateFormat = el.dateFormat
          value.dateId = dateId
          elementList.splice(i, 0, value)
          i++
        }
      }
      i--
    } else if (el.type === ElementType.CONTROL) {
      // 兼容控件内容类型错误
      if (!el.control) {
        i++
        continue
      }
      const {
        prefix,
        postfix,
        preText,
        postText,
        value,
        placeholder,
        code,
        type,
        valueSets
      } = el.control
      const {
        editorOptions: {
          control: controlOption,
          checkbox: checkboxOption,
          radio: radioOption
        }
      } = options
      const controlId = el.controlId || getUUID()
      const isOnlyNestedControlValue =
        Array.isArray(value) &&
        value.length === 1 &&
        value[0].type === ElementType.CONTROL &&
        !!value[0].control
      // 移除父节点
      elementList.splice(i, 1)
      // 控件上下文提取（压缩后的控件上下文无法提取）
      const controlContext = pickObject(el, [
        ...EDITOR_ELEMENT_CONTEXT_ATTR,
        ...EDITOR_ROW_ATTR
      ])
      if (parentControlId) {
        controlContext.parentControlId = parentControlId
      }
      // 控件设置的默认样式（以前缀为基准）
      const controlDefaultStyle = {
        ...pickObject(el, CONTROL_STYLE_ATTR),
        ...pickObject(<IElement>(<unknown>el.control), CONTROL_STYLE_ATTR)
      }
      const controlExplicitStyle = pickObject(
        <IElement>(<unknown>el.control),
        CONTROL_STYLE_ATTR
      )
      if (
        controlExplicitStyle.color === editorOptions.defaultColor &&
        Array.isArray(value) &&
        !value.some(valueElement => valueElement.color !== undefined)
      ) {
        delete controlExplicitStyle.color
      }
      // 前后缀个性化设置
      const thePrePostfixArg: Omit<IElement, 'value'> = {
        ...controlDefaultStyle,
        color: editorOptions.control.bracketColor
      }
      // 前缀
      const prefixValue = prefix ?? controlOption.prefix
      const prefixStrList = isOnlyNestedControlValue
        ? ['']
        : prefixValue
          ? splitText(prefixValue)
          : []
      for (let p = 0; p < prefixStrList.length; p++) {
        const value = prefixStrList[p]
        elementList.splice(i, 0, {
          ...controlContext,
          ...thePrePostfixArg,
          controlId,
          value,
          type: el.type,
          control: el.control,
          controlComponent: ControlComponent.PREFIX
        })
        i++
      }
      // 前文本
      if (preText) {
        const preTextStrList = splitText(preText)
        for (let p = 0; p < preTextStrList.length; p++) {
          const value = preTextStrList[p]
          elementList.splice(i, 0, {
            ...controlContext,
            ...controlDefaultStyle,
            controlId,
            value,
            type: el.type,
            control: el.control,
            controlComponent: ControlComponent.PRE_TEXT
          })
          i++
        }
      }
      // 值
      if (
        (value && value.length) ||
        type === ControlType.CHECKBOX ||
        type === ControlType.RADIO ||
        (type === ControlType.SELECT &&
          code !== undefined &&
          code !== null &&
          (!value || !value.length))
      ) {
        let valueList: IElement[] = value ? deepClone(value) : []
        if (type === ControlType.CHECKBOX) {
          const codeList =
            code !== undefined && code !== null ? String(code).split(',') : []
          if (Array.isArray(valueSets) && valueSets.length) {
            // 拆分valueList优先使用其属性
            const valueStyleList = createControlValueStyleList(valueList)
            let valueStyleIndex = 0
            for (let v = 0; v < valueSets.length; v++) {
              const valueSet = valueSets[v]
              // checkbox组件
              elementList.splice(i, 0, {
                ...controlContext,
                ...controlDefaultStyle,
                controlId,
                value: '',
                type: el.type,
                control: el.control,
                controlComponent: ControlComponent.CHECKBOX,
                checkbox: {
                  code: String(valueSet.code),
                  value: codeList.includes(String(valueSet.code))
                }
              })
              i++
              // 文本
              const result = appendControlValueSetText({
                elementList,
                insertIndex: i,
                valueStyleIndex,
                valueStyleList,
                value: valueSet.value,
                gap: checkboxOption.gap,
                controlId,
                control: el.control,
                controlContext,
                controlExplicitStyle
              })
              i = result.insertIndex
              valueStyleIndex = result.valueStyleIndex
            }
          }
        } else if (type === ControlType.RADIO) {
          if (Array.isArray(valueSets) && valueSets.length) {
            // 拆分valueList优先使用其属性
            const valueStyleList = createControlValueStyleList(valueList)
            let valueStyleIndex = 0
            for (let v = 0; v < valueSets.length; v++) {
              const valueSet = valueSets[v]
              // radio组件
              elementList.splice(i, 0, {
                ...controlContext,
                ...controlDefaultStyle,
                controlId,
                value: '',
                type: el.type,
                control: el.control,
                controlComponent: ControlComponent.RADIO,
                radio: {
                  code: String(valueSet.code),
                  value:
                    code !== undefined &&
                    code !== null &&
                    String(code) === String(valueSet.code)
                }
              })
              i++
              // 文本
              const result = appendControlValueSetText({
                elementList,
                insertIndex: i,
                valueStyleIndex,
                valueStyleList,
                value: valueSet.value,
                gap: radioOption.gap,
                controlId,
                control: el.control,
                controlContext,
                controlExplicitStyle
              })
              i = result.insertIndex
              valueStyleIndex = result.valueStyleIndex
            }
          }
        } else {
          if (!value || !value.length) {
            if (Array.isArray(valueSets) && valueSets.length) {
              const valueSet = valueSets.find(
                v =>
                  code !== undefined &&
                  code !== null &&
                  String(v.code) === String(code)
              )
              if (valueSet) {
                valueList = [
                  {
                    value: valueSet.value
                  }
                ]
              }
            }
          }
          formatElementList(valueList, {
            ...options,
            isHandleFirstElement: false,
            isForceCompensation: false,
            isFromControlValue: true,
            parentControlId: controlId
          })
          const isOnlyNestedControlValue =
            valueList.length === 1 &&
            valueList[0].type === ElementType.CONTROL &&
            !!valueList[0].control
          if (isOnlyNestedControlValue) {
            valueList[0].value = getControlInlineContentText(
              valueList[0],
              editorOptions
            )
          }
          for (let v = 0; v < valueList.length; v++) {
            const element = valueList[v]
            const value = element.value
            elementList.splice(i, 0, {
              ...controlContext,
              ...controlExplicitStyle,
              ...element,
              controlId: element.parentControlId
                ? element.controlId
                : controlId,
              value: value === '\n' ? ZERO : value,
              type: element.type || ElementType.TEXT,
              control:
                element.type === ElementType.CONTROL && element.control
                  ? element.control
                  : el.control,
              controlComponent: element.parentControlId
                ? element.controlComponent
                : ControlComponent.VALUE
            })
            i++
          }
        }
      } else if (placeholder) {
        // placeholder
        const thePlaceholderArgs: Omit<IElement, 'value'> = {
          ...controlDefaultStyle,
          color: editorOptions.control.placeholderColor
        }
        const placeholderStrList = splitText(placeholder)
        for (let p = 0; p < placeholderStrList.length; p++) {
          const value = placeholderStrList[p]
          elementList.splice(i, 0, {
            ...controlContext,
            ...thePlaceholderArgs,
            controlId,
            value: value === '\n' ? ZERO : value,
            type: el.type,
            control: el.control,
            controlComponent: ControlComponent.PLACEHOLDER
          })
          i++
        }
      }
      // 后文本
      if (postText) {
        const postTextStrList = splitText(postText)
        for (let p = 0; p < postTextStrList.length; p++) {
          const value = postTextStrList[p]
          elementList.splice(i, 0, {
            ...controlContext,
            ...controlDefaultStyle,
            controlId,
            value,
            type: el.type,
            control: el.control,
            controlComponent: ControlComponent.POST_TEXT
          })
          i++
        }
      }
      // 后缀
      const postfixValue = postfix ?? controlOption.postfix
      const postfixStrList = isOnlyNestedControlValue
        ? ['']
        : postfixValue
          ? splitText(postfixValue)
          : []
      for (let p = 0; p < postfixStrList.length; p++) {
        const value = postfixStrList[p]
        elementList.splice(i, 0, {
          ...controlContext,
          ...thePrePostfixArg,
          controlId,
          value,
          type: el.type,
          control: el.control,
          controlComponent: ControlComponent.POSTFIX
        })
        i++
      }
      i--
    } else if (
      (!el.type || TEXTLIKE_ELEMENT_TYPE.includes(el.type)) &&
      el.value?.length > 1
    ) {
      elementList.splice(i, 1)
      const valueList = splitText(el.value)
      for (let v = 0; v < valueList.length; v++) {
        const nextElement = { ...el, value: valueList[v] }
        if (isFromControlValue) {
          CONTROL_STYLE_ATTR.forEach(attr => {
            if (el[attr] === undefined) {
              delete nextElement[attr]
            }
          })
        }
        elementList.splice(i + v, 0, nextElement)
      }
      el = elementList[i]
    }
    if (el.value === '\n' || el.value == '\r\n') {
      el.value = ZERO
    }
    if (el.type === ElementType.IMAGE || el.type === ElementType.BLOCK) {
      el.id = el.id || getUUID()
    }
    if (el.type === ElementType.LATEX) {
      const { svg, width, height } = LaTexParticle.convertLaTextToSVG(el.value)
      el.width = el.width || width
      el.height = el.height || height
      el.laTexSVG = svg
      el.id = el.id || getUUID()
    }
    i++
  }
}

