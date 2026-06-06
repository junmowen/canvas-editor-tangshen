/** DOCX 主文档关系部件路径。 */
export const OOXML_DOCUMENT_RELATIONSHIPS_PART = 'word/_rels/document.xml.rels'

/** OOXML relationship 类型前缀，便于调用方识别标准关系。 */
export const OOXML_RELATIONSHIP_TYPE_PREFIX =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'

/** OOXML 导入阶段使用的单条 relationship 描述。 */
export interface IOoxmlImportRelationship {
  /** relationship id，通常是 rId1、rIdImage1 或 rIdHyperlink1。 */
  id: string
  /** relationship 类型，例如 hyperlink、image 的完整 OOXML 类型 URI。 */
  type: string
  /** relationship 目标路径或外部 URL。 */
  target: string
  /** relationship 目标模式，外链通常是 External，包内资源通常为空。 */
  targetMode?: string
}

/** 以 relationship id 为 key 的查询表。 */
export type OoxmlImportRelationshipMap = Record<string, IOoxmlImportRelationship>

/** 获取 package part 所在目录，用于把相对 target 还原为包内路径。 */
function getOoxmlPartDirectory(partPath: string) {
  const normalizedPath = partPath.replace(/^\/+/, '')
  const separatorIndex = normalizedPath.lastIndexOf('/')
  return separatorIndex >= 0 ? normalizedPath.slice(0, separatorIndex) : ''
}

/** 归一化 package 内路径中的 . 和 .. 片段，避免 header/footer 相对资源解析错误。 */
function normalizeOoxmlPackagePath(path: string) {
  const segmentList: string[] = []
  path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .forEach(segment => {
      if (segment === '.') return
      if (segment === '..') {
        segmentList.pop()
        return
      }
      segmentList.push(segment)
    })
  return segmentList.join('/')
}

/** 根据任意 package part 路径计算它对应的 relationships part 路径。 */
export function createOoxmlRelationshipsPartPath(sourcePartPath: string) {
  const normalizedPath = normalizeOoxmlPackagePath(sourcePartPath)
  const directory = getOoxmlPartDirectory(normalizedPath)
  const fileName = normalizedPath.slice(directory ? directory.length + 1 : 0)
  return normalizeOoxmlPackagePath(
    `${directory ? `${directory}/` : ''}_rels/${fileName}.rels`
  )
}

/** 把 relationship target 按来源 part 解析为 DOCX 包内绝对路径。 */
export function resolveOoxmlRelationshipTargetPath(
  sourcePartPath: string,
  target: string | undefined
) {
  if (!target) return ''
  const normalizedTarget = target.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalizedTarget) return ''
  if (normalizedTarget.startsWith('word/')) {
    return normalizeOoxmlPackagePath(normalizedTarget)
  }
  const sourceDirectory = getOoxmlPartDirectory(sourcePartPath)
  return normalizeOoxmlPackagePath(
    `${sourceDirectory ? `${sourceDirectory}/` : ''}${normalizedTarget}`
  )
}

/** 从 XML 元素读取属性，集中处理空值归一化。 */
function getOoxmlRelationshipAttribute(element: Element, name: string) {
  return element.getAttribute(name) || ''
}

/** 判断 DOMParser 是否解析出 XML 错误节点。 */
function hasOoxmlXmlParserError(document: Document) {
  return document.getElementsByTagName('parsererror').length > 0
}

/** 把单个 Relationship 元素转换为导入关系对象。 */
function createOoxmlRelationshipFromElement(element: Element) {
  const id = getOoxmlRelationshipAttribute(element, 'Id')
  const type = getOoxmlRelationshipAttribute(element, 'Type')
  const target = getOoxmlRelationshipAttribute(element, 'Target')
  const targetMode = getOoxmlRelationshipAttribute(element, 'TargetMode')

  // 缺少核心三元组的关系无法被后续 rId 查找正确使用，因此直接跳过。
  if (!id || !type || !target) return null

  return {
    id,
    type,
    target,
    ...(targetMode ? { targetMode } : {})
  }
}

/** 解析 OOXML relationships XML，返回 rId 到关系详情的映射。 */
export function parseOoxmlRelationshipsXml(xml: string) {
  const relationships: OoxmlImportRelationshipMap = {}

  // 空字符串代表关系部件不存在或没有内容，导入流程保持宽容并返回空表。
  if (!xml) return relationships

  const parser = new DOMParser()
  const document = parser.parseFromString(xml, 'application/xml')

  // XML 结构损坏时抛出明确错误，避免后续图片或超链接导入静默丢失。
  if (hasOoxmlXmlParserError(document)) {
    throw new Error('Invalid OOXML relationships XML')
  }

  const relationshipElements = Array.from(document.getElementsByTagName('Relationship'))
  for (const element of relationshipElements) {
    const relationship = createOoxmlRelationshipFromElement(element)

    // 单条关系不完整时跳过，保留同一部件内其它可用关系。
    if (!relationship) continue

    relationships[relationship.id] = relationship
  }

  return relationships
}

/** 从 DOCX 文本部件集合解析任意 package part 的关系映射。 */
export function resolveOoxmlPartRelationships(
  textParts: Record<string, string>,
  sourcePartPath: string
) {
  return parseOoxmlRelationshipsXml(
    textParts[createOoxmlRelationshipsPartPath(sourcePartPath)] || ''
  )
}

/** 从 DOCX 文本部件集合解析 word/document.xml.rels 的关系映射。 */
export function resolveOoxmlDocumentRelationships(textParts: Record<string, string>) {
  return resolveOoxmlPartRelationships(textParts, 'word/document.xml')
}

/** 按 id 从关系映射中读取单条关系，隐藏调用方空表判断。 */
export function getOoxmlRelationshipById(
  relationships: OoxmlImportRelationshipMap,
  relationshipId: string | undefined
) {
  // 没有 rId 的引用在 OOXML 中不可解析，统一返回 undefined。
  if (!relationshipId) return undefined

  return relationships[relationshipId]
}

/** 判断关系是否属于指定 OOXML 标准类型短名。 */
export function isOoxmlRelationshipType(
  relationship: IOoxmlImportRelationship | undefined,
  typeName: string
) {
  // 未解析到关系时不能匹配任何类型。
  if (!relationship) return false

  return relationship.type === `${OOXML_RELATIONSHIP_TYPE_PREFIX}${typeName}`
}
