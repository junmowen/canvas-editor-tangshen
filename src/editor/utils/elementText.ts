import { ZERO } from '../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../dataset/constant/Element'
import { ElementType } from '../dataset/enum/Element'
import { ListType, UlStyle } from '../dataset/enum/List'
import { ulStyleMapping } from '../dataset/constant/List'
import { IElement } from '../interface/Element'
import { IRowElement } from '../interface/Row'
import { deepCloneOmitKeys } from '.'
import { splitListElement, zipElementList } from './element'

/**
 * 将元素列表转换成纯文本。
 *
 * 表格、标题、列表、复选框、单选框等结构化元素会在这里压平成可读文本，
 * 用于复制、导出和外部系统消费。
 */
export function getTextFromElementList(elementList: IElement[]) {
  function buildText(payload: IElement[]): string {
    let text = ''
    for (let e = 0; e < payload.length; e++) {
      const element = payload[e]
      if (element.type === ElementType.TABLE) {
        text += `\n`
        const trList = element.trList!
        for (let t = 0; t < trList.length; t++) {
          const tr = trList[t]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const tdText = buildText(zipElementList(td.value!))
            const isFirst = d === 0
            const isLast = tr.tdList.length - 1 === d
            text += `${!isFirst ? `  ` : ``}${tdText}${isLast ? `\n` : ``}`
          }
        }
      } else if (element.type === ElementType.TAB) {
        text += `\t`
      } else if (element.type === ElementType.HYPERLINK) {
        text += element.valueList!.map(v => v.value).join('')
      } else if (element.type === ElementType.TITLE) {
        text += `${buildText(zipElementList(element.valueList!))}`
      } else if (element.type === ElementType.LIST) {
        const zipList = zipElementList(element.valueList!)
        const listElementListMap = splitListElement(zipList)
        let ulListStyleText = ''
        if (element.listType === ListType.UL) {
          ulListStyleText =
            ulStyleMapping[<UlStyle>(<unknown>element.listStyle)]
        }
        listElementListMap.forEach((listElementList, listIndex) => {
          const isLast = listElementListMap.size - 1 === listIndex
          text += `\n${ulListStyleText || `${listIndex + 1}.`}${buildText(
            listElementList
          )}${isLast ? `\n` : ``}`
        })
      } else if (element.type === ElementType.CHECKBOX) {
        text += element.checkbox?.value ? `☑` : `□`
      } else if (element.type === ElementType.RADIO) {
        text += element.radio?.value ? `☉` : `○`
      } else if (
        !element.type ||
        element.type === ElementType.LATEX ||
        TEXTLIKE_ELEMENT_TYPE.includes(element.type)
      ) {
        let textLike = ''
        if (element.type === ElementType.CONTROL) {
          const controlValue = element.control!.value?.[0]?.value || ''
          textLike = controlValue
            ? `${element.control?.preText || ''}${controlValue}${
                element.control?.postText || ''
              }`
            : ''
        } else if (element.type === ElementType.DATE) {
          textLike = element.valueList?.map(v => v.value).join('') || ''
        } else {
          textLike = element.value
        }
        text += textLike.replace(new RegExp(`${ZERO}`, 'g'), '\n')
      }
    }
    return text
  }
  return buildText(zipElementList(elementList))
}

/**
 * 克隆元素列表时去掉仅布局期使用的度量字段，减少历史记录和导出数据体积。
 */
export function getSlimCloneElementList(elementList: IElement[]) {
  return deepCloneOmitKeys<IElement[], IRowElement>(elementList, [
    'metrics',
    'style'
  ])
}
