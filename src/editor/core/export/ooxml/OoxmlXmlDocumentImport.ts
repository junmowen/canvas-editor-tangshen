import { isOoxmlElement } from './OoxmlDom'

/** 解析 XML 字符串或复用已解析 DOM，并校验根节点。 */
export function parseOoxmlXmlDocument(
  xml: string | Document,
  payload: {
    /** 错误提示中的部件名称。 */
    partName: string
    /** 可选根节点本地名，传入时必须匹配。 */
    rootLocalName?: string
  }
) {
  let documentElement: Element
  if (typeof xml === 'string') {
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    const parserError = document.getElementsByTagName('parsererror')[0]
    if (parserError) {
      throw new Error(`Invalid OOXML ${payload.partName}`)
    }
    documentElement = document.documentElement
  } else {
    documentElement = xml.documentElement
  }

  if (
    payload.rootLocalName &&
    !isOoxmlElement(documentElement, payload.rootLocalName)
  ) {
    throw new Error(`Missing OOXML ${payload.rootLocalName}`)
  }
  return documentElement
}
