import { IEditorData, IEditorOption } from '../../../interface/Editor'
import {
  parseOoxmlDocumentXmlToEditorData,
  parseOoxmlHeaderFooterXmlToElementList
} from './OoxmlDocumentImport'
import { TOoxmlImageDataUrlCache } from './OoxmlImageImport'
import { importOoxmlDocumentOptions } from './OoxmlDocumentOptionImport'
import { importOoxmlSettingsOptions } from './OoxmlSettingsImport'
import {
  getOoxmlRelationshipById,
  isOoxmlRelationshipType,
  resolveOoxmlDocumentRelationships,
  resolveOoxmlPartRelationships,
  resolveOoxmlRelationshipTargetPath
} from './OoxmlImportRelationships'
import {
  importOoxmlDocxBytes,
  OOXML_DOCUMENT_XML_PART,
  OOXML_SETTINGS_XML_PART
} from './OoxmlZipImport'
import type { IOoxmlImportedDocxPackage } from './OoxmlZipImport'
import {
  getOoxmlAttribute,
  getOoxmlChildElements as getChildElements,
  getOoxmlRelationshipId,
  isOoxmlElement
} from './OoxmlDom'

export {
  extractOoxmlDocumentXml,
  importOoxmlDocxBytes,
  OOXML_DOCUMENT_XML_PART,
  OOXML_SETTINGS_XML_PART,
  parseOoxmlDocxParts,
  parseOoxmlDocxTextParts
} from './OoxmlZipImport'
export type { IOoxmlImportedDocxPackage } from './OoxmlZipImport'

/** DOCX 字节导入到编辑器数据后的完整结果，保留 package 上下文便于调试。 */
export interface IOoxmlImportedEditorDataResult extends IOoxmlImportedDocxPackage {
  /** 可直接写入编辑器的 main/header/footer 数据。 */
  data: IEditorData
  /** 从 word/document.xml 恢复出的页面设置子集。 */
  options: Partial<IEditorOption>
}

/** 页眉页脚引用解析结果，记录默认引用的真实 package 路径。 */
interface IOoxmlHeaderFooterReferenceParts {
  /** 默认页眉部件路径。 */
  headerPartPath?: string
  /** 默认页脚部件路径。 */
  footerPartPath?: string
}

/** 判断文档是否包含指定本地名的元素，避免为存在性检查创建数组。 */
function hasOoxmlDescendantElement(root: Document | Element, localName: string) {
  const elementList = root.getElementsByTagName('*')
  for (let index = 0; index < elementList.length; index++) {
    if (isOoxmlElement(elementList[index], localName)) return true
  }
  return false
}

/** 获取最后一个匹配本地名的后代元素，供 sectPr 等末尾配置节点读取。 */
function getLastOoxmlDescendantElement(
  root: Document | Element,
  localName: string
) {
  let matchedElement: Element | undefined
  const elementList = root.getElementsByTagName('*')
  for (let index = 0; index < elementList.length; index++) {
    const element = elementList[index]
    if (isOoxmlElement(element, localName)) {
      matchedElement = element
    }
  }
  return matchedElement
}

/** 解析 XML 并抛出明确错误，供页眉页脚引用扫描使用。 */
function parseOoxmlXml(xml: string, partName: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (hasOoxmlDescendantElement(document, 'parsererror')) {
    throw new Error(`Invalid OOXML ${partName}`)
  }
  return document
}

/** 读取主文档最后一个 sectPr，默认页眉页脚引用通常写在这里。 */
function getOoxmlDocumentSectionProperties(document: Document) {
  return getLastOoxmlDescendantElement(document, 'sectPr')
}

/** 判断页眉页脚引用是否是默认类型，首/偶数页本批先保留为后续扩展。 */
function isDefaultHeaderFooterReference(referenceElement: Element) {
  const type = getOoxmlAttribute(referenceElement, 'type')
  return !type || type === 'default'
}

/** 从默认页眉或页脚引用中解析出对应 package part 路径。 */
function resolveOoxmlHeaderFooterReferencePartPath(
  referenceElement: Element | undefined,
  payload: {
    /** 主文档关系表。 */
    relationships: ReturnType<typeof resolveOoxmlDocumentRelationships>
    /** 关系类型短名，header 或 footer。 */
    relationshipType: 'header' | 'footer'
  }
) {
  if (!referenceElement || !isDefaultHeaderFooterReference(referenceElement)) {
    return undefined
  }
  const relationship = getOoxmlRelationshipById(
    payload.relationships,
    getOoxmlRelationshipId(referenceElement)
  )
  if (!isOoxmlRelationshipType(relationship, payload.relationshipType)) {
    return undefined
  }
  return resolveOoxmlRelationshipTargetPath(
    OOXML_DOCUMENT_XML_PART,
    relationship?.target
  )
}

/** 从 word/document.xml 的 sectPr 中读取默认页眉页脚部件路径。 */
function resolveOoxmlDefaultHeaderFooterPartPaths(
  document: Document,
  relationships: ReturnType<typeof resolveOoxmlDocumentRelationships>
): IOoxmlHeaderFooterReferenceParts {
  const sectionProperties = getOoxmlDocumentSectionProperties(document)
  const headerReference = getChildElements(sectionProperties, 'headerReference').find(
    isDefaultHeaderFooterReference
  )
  const footerReference = getChildElements(sectionProperties, 'footerReference').find(
    isDefaultHeaderFooterReference
  )
  return {
    headerPartPath: resolveOoxmlHeaderFooterReferencePartPath(headerReference, {
      relationships,
      relationshipType: 'header'
    }),
    footerPartPath: resolveOoxmlHeaderFooterReferencePartPath(footerReference, {
      relationships,
      relationshipType: 'footer'
    })
  }
}

/** 解析单个页眉或页脚 part，关系表必须按当前 part 单独读取。 */
function parseOoxmlHeaderFooterPart(
  packageResult: IOoxmlImportedDocxPackage,
  payload: {
    /** 页眉页脚 package 路径。 */
    partPath?: string
    /** 期望根节点本地名。 */
    rootLocalName: 'hdr' | 'ftr'
    /** 单次 DOCX 导入请求内的图片 data URL 缓存。 */
    imageDataUrlCache?: TOoxmlImageDataUrlCache
  }
) {
  if (!payload.partPath) return undefined
  const xml = packageResult.textParts[payload.partPath]
  if (!xml) return undefined
  return parseOoxmlHeaderFooterXmlToElementList(xml, {
    rootLocalName: payload.rootLocalName,
    relationships: resolveOoxmlPartRelationships(
      packageResult.textParts,
      payload.partPath
    ),
    packageParts: packageResult.parts,
    imageDataUrlCache: payload.imageDataUrlCache
  })
}

/** 解析 DOCX 字节并恢复为编辑器 main/header/footer 数据。 */
export function importOoxmlDocxBytesToEditorData(
  bytes: Uint8Array
): IOoxmlImportedEditorDataResult {
  const packageResult = importOoxmlDocxBytes(bytes)
  const imageDataUrlCache: TOoxmlImageDataUrlCache = new Map()
  const document = parseOoxmlXml(
    packageResult.documentXml,
    OOXML_DOCUMENT_XML_PART
  )
  const documentRelationships = resolveOoxmlDocumentRelationships(
    packageResult.textParts
  )
  const importedDocument = parseOoxmlDocumentXmlToEditorData(
    document,
    {
      relationships: documentRelationships,
      packageParts: packageResult.parts,
      imageDataUrlCache
    }
  )
  const headerFooterPartPaths = resolveOoxmlDefaultHeaderFooterPartPaths(
    document,
    documentRelationships
  )
  const header = parseOoxmlHeaderFooterPart(packageResult, {
    partPath: headerFooterPartPaths.headerPartPath,
    rootLocalName: 'hdr',
    imageDataUrlCache
  })
  const footer = parseOoxmlHeaderFooterPart(packageResult, {
    partPath: headerFooterPartPaths.footerPartPath,
    rootLocalName: 'ftr',
    imageDataUrlCache
  })

  return {
    ...packageResult,
    data: {
      main: importedDocument.data.main,
      ...(header ? { header } : {}),
      ...(footer ? { footer } : {})
    },
    options: {
      ...importOoxmlDocumentOptions(document),
      ...importOoxmlSettingsOptions(
        packageResult.textParts[OOXML_SETTINGS_XML_PART] || ''
      )
    }
  }
}
