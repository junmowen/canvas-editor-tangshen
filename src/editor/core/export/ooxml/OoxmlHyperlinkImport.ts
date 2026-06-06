import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import {
  getOoxmlRelationshipById,
  isOoxmlRelationshipType
} from './OoxmlImportRelationships'
import { getOoxmlChildElements as getChildElements, getOoxmlRelationshipId } from './OoxmlDom'
import type { IOoxmlDocumentImportOption } from './OoxmlDocumentImport'

/** 把普通文本元素标记为内部超链接元素。 */
function createHyperlinkTextElement(
  element: IElement,
  payload: {
    /** 当前超链接 relationship id。 */
    relationshipId: string
    /** 当前超链接 URL。 */
    url: string
  }
) {
  return {
    ...element,
    type: ElementType.HYPERLINK,
    hyperlinkId: payload.relationshipId,
    url: payload.url
  }
}

/** 把 w:hyperlink 内部 run 转换为带相同 hyperlinkId 的内部元素。 */
export function parseOoxmlHyperlinkElement(
  hyperlinkElement: Element,
  options: IOoxmlDocumentImportOption,
  parseRunElement: (
    runElement: Element,
    options: IOoxmlDocumentImportOption
  ) => IElement[]
) {
  const relationshipId = getOoxmlRelationshipId(hyperlinkElement)
  const relationship = getOoxmlRelationshipById(
    options.relationships || {},
    relationshipId
  )
  const runElementList = getChildElements(hyperlinkElement, 'r')
  const elementList = runElementList.flatMap(runElement =>
    parseRunElement(runElement, options)
  )

  if (!isOoxmlRelationshipType(relationship, 'hyperlink')) {
    return elementList
  }

  return elementList.map(element => {
    if (element.type) return element
    return createHyperlinkTextElement(element, {
      relationshipId: relationship!.id,
      url: relationship!.target
    })
  })
}
