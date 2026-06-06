import { IElement } from '../../interface/Element'
import { IDocumentStyle } from '../../interface/Style'
import {
  applyDocumentStyleToElement,
  clearDocumentStyleFromElement
} from '../modules/style/DocumentStylePolicy'

/** 克隆文档样式库，避免命令层直接持有外部传入对象引用。 */
export function cloneDocumentStyleList(styleList: IDocumentStyle[]) {
  return styleList.map(style => ({ ...style }))
}

/** 把文档样式应用到当前段落集合，返回是否发生有效写入。 */
export function applyDocumentStyleToParagraphList(payload: {
  /** 段落元素集合。 */
  paragraphElementList: IElement[] | null | undefined
  /** 文档样式库。 */
  styles: IDocumentStyle[] | undefined
  /** 目标样式 id。 */
  styleId: string
}) {
  const { paragraphElementList, styles, styleId } = payload
  if (!paragraphElementList?.length || !styles?.length) return false
  paragraphElementList.forEach(element => {
    Object.assign(element, applyDocumentStyleToElement(element, styles, styleId))
  })
  return true
}

/** 清除当前段落集合的文档样式关联，返回是否发生有效写入。 */
export function clearDocumentStyleFromParagraphList(
  paragraphElementList: IElement[] | null | undefined
) {
  if (!paragraphElementList?.length) return false
  paragraphElementList.forEach(element => {
    const nextElement = clearDocumentStyleFromElement(element)
    delete element.styleId
    delete element.styleName
    Object.assign(element, nextElement)
  })
  return true
}
