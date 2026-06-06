/** 判断节点是否为元素节点，便于安全读取 localName。 */
export function isOoxmlElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

/** 判断元素本地名是否匹配，避免依赖固定的 w: 前缀。 */
export function isOoxmlElement(element: Element, localName: string) {
  return element.localName === localName
}

/** 判断 XML 是否解析失败，损坏 OOXML 部件不能静默吞掉。 */
export function hasOoxmlParserError(document: Document) {
  return document.getElementsByTagName('parsererror').length > 0
}

/** 按 localName 查找第一个后代元素，支持命名空间前缀变化或前缀丢失。 */
export function getFirstOoxmlElement(
  root: Document | Element,
  localName: string
) {
  const elementList = root.getElementsByTagName('*')
  for (let index = 0; index < elementList.length; index++) {
    const element = elementList[index]
    if (isOoxmlElement(element, localName)) {
      return element
    }
  }
  return undefined
}

/** 按 localName 查找直接子元素，避免误读嵌套同名节点。 */
export function getOoxmlChildElement(
  element: Element | undefined,
  localName?: string
) {
  if (!element) return undefined
  for (let index = 0; index < element.childNodes.length; index++) {
    const child = element.childNodes[index]
    if (
      isOoxmlElementNode(child) &&
      (!localName || isOoxmlElement(child, localName))
    ) {
      return child
    }
  }
  return undefined
}

/** 按 localName 查找直接子元素列表，避免误读嵌套同名节点。 */
export function getOoxmlChildElements(
  element: Element | undefined,
  localName?: string
) {
  if (!element) return []
  const childElementList = Array.from(element.childNodes).filter(
    isOoxmlElementNode
  )
  if (!localName) return childElementList
  return childElementList.filter(child => isOoxmlElement(child, localName))
}

/** 判断是否存在指定直接子元素。 */
export function hasOoxmlChildElement(
  element: Element | undefined,
  localName: string
) {
  return !!getOoxmlChildElement(element, localName)
}

/** 读取带命名空间前缀的 OOXML 属性，失败时读取无前缀属性。 */
export function getOoxmlPrefixedAttribute(
  element: Element | undefined,
  prefix: string,
  name: string
) {
  if (!element) return null
  return element.getAttribute(`${prefix}:${name}`) || element.getAttribute(name)
}

/** 读取 WordprocessingML 属性。 */
export function getOoxmlAttribute(
  element: Element | undefined,
  name: string
) {
  return getOoxmlPrefixedAttribute(element, 'w', name)
}

/** 读取 OOXML 关系 id。 */
export function getOoxmlRelationshipId(element: Element | undefined) {
  return getOoxmlPrefixedAttribute(element, 'r', 'id') || undefined
}
