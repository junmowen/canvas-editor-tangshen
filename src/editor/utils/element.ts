import {
  deepClone,
  isArrayEqual,
  pickObject
} from '.'

/**
 * 元素工具门面。
 *
 * 文件内仅保留元素属性挑选与元素列表压缩逻辑；
 * 格式化、DOM/HTML 互转、控件文本、上下文继承、布局判断、文本导出等职责已拆到相邻模块并在此统一转导出，
 * 以保持历史 import 路径 `utils/element` 兼容。
 */
import { ZERO } from '../dataset/constant/Common'
import {
  CONTROL_STYLE_ATTR,
  EDITOR_ELEMENT_ZIP_ATTR,
  EDITOR_ROW_ATTR,
  TABLE_TD_ZIP_ATTR
} from '../dataset/constant/Element'
import { ControlComponent } from '../dataset/enum/Control'
import { ElementType } from '../dataset/enum/Element'
import { IControlSelect } from '../interface/Control'
import { IElement } from '../interface/Element'
import { ITd } from '../interface/table/Td'

export {
  getControlInlineContentText,
  getControlInlineText
} from './elementControl'
export {
  formatElementContext,
  getAnchorElement
} from './elementContext'
export {
  convertRowFlexToJustifyContent,
  convertRowFlexToTextAlign,
  convertTextAlignToRowFlex,
  deleteSurroundElementList,
  getIsBlockElement,
  getNonHideElementIndex,
  isTextLikeElement,
  pickSurroundElementList,
  replaceHTMLElementTag
} from './elementLayout'
export {
  getSlimCloneElementList,
  getTextFromElementList
} from './elementText'
export {
  formatElementList,
  unzipElementList
} from './elementFormat'
export {
  convertElementToDom,
  convertTextNodeToElement,
  createDomFromElementList,
  getElementListByHTML,
  groupElementListByRowFlex,
  splitListElement
} from './elementDom'
export type { IGetElementListByHTMLOption } from './elementDom'

export function isSameElementExceptValue(
  source: IElement,
  target: IElement
): boolean {
  const sourceKeys = Object.keys(source)
  const targetKeys = Object.keys(target)
  if (sourceKeys.length !== targetKeys.length) return false
  for (let s = 0; s < sourceKeys.length; s++) {
    const key = sourceKeys[s] as never
    // 值不需要校验
    if (key === 'value') continue
    // groupIds数组需特殊校验数组是否相等
    if (
      key === 'groupIds' &&
      Array.isArray(source[key]) &&
      Array.isArray(target[key]) &&
      isArrayEqual(source[key], target[key])
    ) {
      continue
    }
    if (source[key] !== target[key]) {
      return false
    }
  }
  return true
}
interface IPickElementOption {
  extraPickAttrs?: Array<keyof IElement>
}
export function pickElementAttr(
  payload: IElement,
  option: IPickElementOption = {}
): IElement {
  const { extraPickAttrs } = option
  const zipAttrs = [...EDITOR_ELEMENT_ZIP_ATTR]
  if (extraPickAttrs) {
    zipAttrs.push(...extraPickAttrs)
  }
  const element: IElement = {
    value: payload.value === ZERO ? `\n` : payload.value
  }
  zipAttrs.forEach(attr => {
    const value = payload[attr] as never
    if (value !== undefined) {
      element[attr] = value
    }
  })
  return element
}

interface IZipElementListOption {
  extraPickAttrs?: Array<keyof IElement>
  isClassifyArea?: boolean
  isClone?: boolean
}
export function zipElementList(
  payload: IElement[],
  options: IZipElementListOption = {}
): IElement[] {
  const { extraPickAttrs, isClassifyArea = false, isClone = true } = options
  const elementList = isClone ? deepClone(payload) : payload
  const zipElementListData: IElement[] = []
  let e = 0
  while (e < elementList.length) {
    let element = elementList[e]
    // 上下文首字符（占位符）-列表首字符要保留避免是复选框
    if (
      e === 0 &&
      element.value === ZERO &&
      !element.listId &&
      (!element.type || element.type === ElementType.TEXT)
    ) {
      e++
      continue
    }
    // 优先处理虚拟元素，后表格、超链接、日期、控件特殊处理
    if (element.areaId) {
      const areaId = element.areaId
      const area = element.area
      // 收集并压缩数据
      const valueList: IElement[] = []
      while (e < elementList.length) {
        const areaE = elementList[e]
        if (areaId !== areaE.areaId) {
          e--
          break
        }
        delete areaE.area
        delete areaE.areaId
        valueList.push(areaE)
        e++
      }
      const areaElementList = zipElementList(valueList, options)
      // 不归类区域元素
      if (isClassifyArea) {
        const areaElement: IElement = {
          type: ElementType.AREA,
          value: '',
          areaId,
          area
        }
        areaElement.valueList = areaElementList
        element = areaElement
      } else {
        zipElementListData.splice(e, 0, ...areaElementList)
        continue
      }
    } else if (element.titleId && element.level) {
      // 标题处理
      const titleId = element.titleId
      if (titleId) {
        const level = element.level
        const titleElement: IElement = {
          type: ElementType.TITLE,
          title: element.title,
          titleId,
          value: '',
          level
        }
        const valueList: IElement[] = []
        while (e < elementList.length) {
          const titleE = elementList[e]
          if (titleId !== titleE.titleId) {
            e--
            break
          }
          delete titleE.level
          delete titleE.title
          valueList.push(titleE)
          e++
        }
        titleElement.valueList = zipElementList(valueList, options)
        element = titleElement
      }
    } else if (element.listId && element.listType) {
      // 列表处理
      const listId = element.listId
      if (listId) {
        const listType = element.listType
        const listStyle = element.listStyle
        const listLevel = element.listLevel
        const listElement: IElement = {
          type: ElementType.LIST,
          value: '',
          listId,
          listType,
          listStyle,
          listLevel,
          extension: element.extension,
          externalId: element.externalId
        }
        const valueList: IElement[] = []
        while (e < elementList.length) {
          const listE = elementList[e]
          if (listId !== listE.listId) {
            e--
            break
          }
          delete listE.listId
          delete listE.listType
          delete listE.listStyle
          valueList.push(listE)
          e++
        }
        listElement.valueList = zipElementList(valueList, options)
        element = listElement
      }
    } else if (element.type === ElementType.TABLE) {
      // 分页表格先进行合并
      if (element.pagingId) {
        const trList = element.trList!
        let tableIndex = e + 1
        let combineCount = 0
        while (tableIndex < elementList.length) {
          const nextElement = elementList[tableIndex]
          if (nextElement.pagingId === element.pagingId) {
            const nexTrList = nextElement.trList!.filter(tr => !tr.pagingRepeat)
            // 第一行存在跨页需特殊处理合并
            const firstTr = nexTrList[0]
            if (firstTr?.tdList[0]?.pagingOriginId) {
              for (let f = 0; f < firstTr.tdList.length; f++) {
                const firstTd = firstTr.tdList[f]
                // 上一个表格从后遍历追加单元格内容
                for (let r = trList.length - 1; r >= 0; r--) {
                  const tr = trList[r]
                  for (let d = 0; d < tr.tdList.length; d++) {
                    const td = tr.tdList[d]
                    if (firstTd.pagingOriginId === td.id) {
                      // 合并value
                      for (let e = 0; e < firstTd.value.length; e++) {
                        const val = firstTd.value[e]
                        val.tdId = td.id
                        val.trId = tr.id
                        val.tableId = element.id
                        td.value.push(val)
                      }
                    }
                  }
                }
              }
              // 修改合并行及表格高度
              const height = firstTr.pagingOriginHeight || firstTr.height
              // 最后一行行高（加上跨页行高）
              trList[trList.length - 1].height += height
              // 合并表格高度（(跨行表格高度 - 第一行实际行高) + 第一行内容高度）
              element.height! += nextElement.height! - firstTr.height + height
              // 删除跨页行
              nexTrList.splice(0, 1)
            }
            element.trList!.push(...nexTrList)
            tableIndex++
            combineCount++
          } else {
            break
          }
        }
        e += combineCount
      }
      if (element.trList) {
        for (let t = 0; t < element.trList.length; t++) {
          const tr = element.trList[t]
          delete tr.id
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const zipTd: ITd = {
              colspan: td.colspan,
              rowspan: td.rowspan,
              value: zipElementList(td.value, options)
            }
            // 压缩单元格属性
            TABLE_TD_ZIP_ATTR.forEach(attr => {
              const value = td[attr] as never
              if (value !== undefined) {
                zipTd[attr] = value
              }
            })
            tr.tdList[d] = zipTd
          }
        }
      }
    } else if (element.type === ElementType.HYPERLINK) {
      // 超链接处理
      const hyperlinkId = element.hyperlinkId
      if (hyperlinkId) {
        const hyperlinkElement: IElement = {
          type: ElementType.HYPERLINK,
          value: '',
          url: element.url
        }
        const valueList: IElement[] = []
        while (e < elementList.length) {
          const hyperlinkE = elementList[e]
          if (hyperlinkId !== hyperlinkE.hyperlinkId) {
            e--
            break
          }
          delete hyperlinkE.type
          delete hyperlinkE.url
          valueList.push(hyperlinkE)
          e++
        }
        hyperlinkElement.valueList = zipElementList(valueList, options)
        element = hyperlinkElement
      }
    } else if (element.type === ElementType.DATE) {
      const dateId = element.dateId
      if (dateId) {
        const dateElement: IElement = {
          type: ElementType.DATE,
          value: '',
          dateFormat: element.dateFormat
        }
        const valueList: IElement[] = []
        while (e < elementList.length) {
          const dateE = elementList[e]
          if (dateId !== dateE.dateId) {
            e--
            break
          }
          delete dateE.type
          delete dateE.dateFormat
          valueList.push(dateE)
          e++
        }
        dateElement.valueList = zipElementList(valueList, options)
        element = dateElement
      }
    } else if (element.controlId) {
      const controlId = element.controlId
      // 控件包含前后缀则转换为控件
      if (element.controlComponent === ControlComponent.PREFIX) {
        const valueList: IElement[] = []
        let isFull = false
        let start = e
        while (start < elementList.length) {
          const controlE = elementList[start]
          const isNestedControlElement = controlE.parentControlId === controlId
          if (controlId !== controlE.controlId && !isNestedControlElement) {
            break
          }
          if (isNestedControlElement) {
            delete controlE.parentControlId
            valueList.push(controlE)
          } else if (controlE.controlComponent === ControlComponent.VALUE) {
            if (controlE.type !== ElementType.CONTROL) {
              delete controlE.control
            }
            delete controlE.controlId
            valueList.push(controlE)
          }
          if (
            !isNestedControlElement &&
            controlE.controlComponent === ControlComponent.POSTFIX
          ) {
            isFull = true
          }
          start++
        }
        if (isFull) {
          // 控件自身样式优先；没有声明时再继承前缀样式
          const controlDefaultStyle = <IControlSelect>(<unknown>{
            ...pickObject(element, CONTROL_STYLE_ATTR),
            ...pickObject(
              <IElement>(<unknown>element.control),
              CONTROL_STYLE_ATTR
            )
          })
          const control = {
            ...element.control!,
            ...controlDefaultStyle
          }
          const controlElement: IElement = {
            ...pickObject(element, EDITOR_ROW_ATTR),
            type: ElementType.CONTROL,
            value: '',
            control,
            controlId
          }
          controlElement.control!.value = zipElementList(valueList, options)
          element = pickElementAttr(controlElement, { extraPickAttrs })
          // 控件元素数量 - 1（当前元素）
          e += start - e - 1
        } else {
          const controlElementList = valueList.filter(element =>
            [
              ControlComponent.VALUE,
              ControlComponent.PRE_TEXT,
              ControlComponent.POST_TEXT,
              ControlComponent.PLACEHOLDER
            ].includes(element.controlComponent!)
          )
          const controlElement = controlElementList[0]
          if (controlElement) {
            const control = {
              ...controlElement.control!,
              value: zipElementList(
                controlElementList.filter(
                  element => element.controlComponent === ControlComponent.VALUE
                ),
                options
              )
            }
            element = pickElementAttr(
              {
                ...pickObject(controlElement, EDITOR_ROW_ATTR),
                type: ElementType.CONTROL,
                value: '',
                control,
                controlId
              },
              { extraPickAttrs }
            )
            e += start - e - 1
          }
        }
      }
      // 不完整的控件元素不转化为控件，如果不是文本则直接忽略
      if (element.controlComponent) {
        delete element.control
        delete element.controlId
        if (
          element.controlComponent !== ControlComponent.VALUE &&
          element.controlComponent !== ControlComponent.PRE_TEXT &&
          element.controlComponent !== ControlComponent.POST_TEXT
        ) {
          e++
          continue
        }
      }
    }
    // 组合元素
    const pickElement = pickElementAttr(element, { extraPickAttrs })
    if (
      !element.type ||
      element.type === ElementType.TEXT ||
      element.type === ElementType.SUBSCRIPT ||
      element.type === ElementType.SUPERSCRIPT
    ) {
      while (e < elementList.length) {
        const nextElement = elementList[e + 1]
        e++
        if (
          nextElement &&
          isSameElementExceptValue(
            pickElement,
            pickElementAttr(nextElement, { extraPickAttrs })
          )
        ) {
          const nextValue =
            nextElement.value === ZERO ? '\n' : nextElement.value
          pickElement.value += nextValue
        } else {
          break
        }
      }
    } else {
      e++
    }
    zipElementListData.push(pickElement)
  }
  if (
    zipElementListData[0] &&
    (!zipElementListData[0].type ||
      zipElementListData[0].type === ElementType.TEXT) &&
    /^\n{2,}/.test(zipElementListData[0].value)
  ) {
    zipElementListData[0].value = zipElementListData[0].value.replace(
      /^\n+/,
      '\n'
    )
  }
  return zipElementListData
}

