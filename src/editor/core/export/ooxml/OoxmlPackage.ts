import { IEditorData, IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import {
  createOoxmlDocumentBackground,
  createOoxmlSectionProperties
} from './OoxmlUnit'
import { createOoxmlDocxBlob, createOoxmlZipPackage } from './OoxmlZip'
import { OoxmlZipPartContent } from './OoxmlZip'
import { createOoxmlStylesXml } from './OoxmlStyles'
import { createOoxmlFontTableXml } from './OoxmlFontTable'
import { createOoxmlNumberingXml } from './OoxmlNumbering'
import {
  collectOoxmlMediaDescriptors,
  IOoxmlMediaDescriptor
} from './OoxmlMedia'
import { createOoxmlSettingsXml } from './OoxmlSettings'
import { createOoxmlHyperlinkRelationshipsXml } from './OoxmlHyperlink'
import { createOoxmlTextWatermarkParagraphXml } from './OoxmlWatermarkExport'
import {
  XML_DECLARATION,
  WORD_DOCUMENT_NAMESPACES
} from './OoxmlCommon'
import { createOoxmlBodyContentXml } from './OoxmlParagraphExport'
import { TOoxmlSeparatorExportOptions } from './OoxmlSeparatorExport'
import {
  collectOoxmlPackageMediaResources,
  collectOoxmlPackageSemanticElements,
  createOoxmlHeaderFooterDescriptors,
  createOoxmlHeaderFooterReferences,
  hasOoxmlInlineRelationships,
  IOoxmlHeaderFooterDescriptor,
  resolveOoxmlHeaderFooterPartVariant
} from './OoxmlPackageAdapter'

export { escapeOoxmlText } from './OoxmlCommon'
export {
  createOoxmlBodyContentXml,
  createOoxmlParagraph,
  createOoxmlParagraphModels,
  createOoxmlTable
} from './OoxmlParagraphExport'

/** OOXML package 部件集合，key 为包内路径，value 为对应 XML 文本。 */
export interface IOoxmlPackageParts {
  /** 允许按任意 package 路径访问 XML 部件，便于传入 ZIP 打包器。 */
  [path: string]: OoxmlZipPartContent
  /** 内容类型声明部件。 */
  '[Content_Types].xml': string
  /** package 根关系部件。 */
  '_rels/.rels': string
  /** Word 正文部件。 */
  'word/document.xml': string
  /** Word 正文关系部件。 */
  'word/_rels/document.xml.rels': string
  /** Word 样式部件。 */
  'word/styles.xml': string
  /** Word 字体表部件。 */
  'word/fontTable.xml': string
  /** Word 编号部件。 */
  'word/numbering.xml': string
  /** Word 全局设置部件。 */
  'word/settings.xml': string
  /** 文档核心属性部件。 */
  'docProps/core.xml': string
  /** 文档扩展属性部件。 */
  'docProps/app.xml': string
}

/** 生成带默认页眉页脚引用的 section properties。 */
function createOoxmlDocumentSectionProperties(
  data: IEditorData,
  options: IEditorOption
) {
  const references = createOoxmlHeaderFooterReferences(data, options)
  if (!references) return createOoxmlSectionProperties(options)
  return createOoxmlSectionProperties(options).replace(
    '</w:sectPr>',
    `${references}</w:sectPr>`
  )
}

/** 生成 word/document.xml 正文部件。 */
export function createOoxmlDocumentXml(data: IEditorData, options: IEditorOption) {
  const body = createOoxmlBodyContentXml(data.main, options)
  const background = createOoxmlDocumentBackground(options)
  const sectionProperties = createOoxmlDocumentSectionProperties(data, options)
  return `${XML_DECLARATION}<w:document ${WORD_DOCUMENT_NAMESPACES}>${background}<w:body>${body}${sectionProperties}</w:body></w:document>`
}

/** 生成默认页眉部件 XML，第一批复用正文段落和表格导出能力。 */
export function createOoxmlHeaderXml(
  elementList: IElement[] = [],
  options?: TOoxmlSeparatorExportOptions
) {
  const editorOptions = (options || {}) as IEditorOption
  const watermarkParagraphXml = createOoxmlTextWatermarkParagraphXml(
    editorOptions.watermark,
    editorOptions
  )
  const bodyContentXml = createOoxmlBodyContentXml(elementList, options)
  const headerContentXml = `${bodyContentXml}${watermarkParagraphXml}`
  return `${XML_DECLARATION}<w:hdr ${WORD_DOCUMENT_NAMESPACES}>${headerContentXml}</w:hdr>`
}

/** 生成默认页脚部件 XML，第一批复用正文段落和表格导出能力。 */
export function createOoxmlFooterXml(
  elementList: IElement[] = [],
  options?: TOoxmlSeparatorExportOptions
) {
  return `${XML_DECLARATION}<w:ftr ${WORD_DOCUMENT_NAMESPACES}>${createOoxmlBodyContentXml(elementList, options)}</w:ftr>`
}

/** 生成 OOXML 内容类型声明。 */
export function createOoxmlContentTypesXml(
  data?: IEditorData,
  options?: IEditorOption
) {
  const headerFooterOverrides = data
    ? createOoxmlHeaderFooterDescriptors(data, options)
        .map(
          descriptor =>
            `<Override PartName="/word/${descriptor.partName}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${descriptor.kind}+xml"/>`
        )
        .join('')
    : ''
  return `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="svg" ContentType="image/svg+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${headerFooterOverrides}</Types>`
}

/** 生成 package 根关系，指向 Word 正文部件。 */
export function createOoxmlRootRelationshipsXml() {
  return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdOfficeDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rIdCoreProperties" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rIdExtendedProperties" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`
}

/** 生成文档核心属性部件，提供标准 DOCX 元数据入口。 */
export function createOoxmlCorePropertiesXml() {
  const namespaces =
    'xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:dcmitype="http://purl.org/dc/dcmitype/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
  return `${XML_DECLARATION}<cp:coreProperties ${namespaces}><dc:creator>canvas-editor</dc:creator><cp:lastModifiedBy>canvas-editor</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">1970-01-01T00:00:00.000Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">1970-01-01T00:00:00.000Z</dcterms:modified></cp:coreProperties>`
}

/** 生成文档扩展属性部件，声明应用来源和文档类型。 */
export function createOoxmlExtendedPropertiesXml() {
  const namespaces =
    'xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"'
  return `${XML_DECLARATION}<Properties ${namespaces}><Application>canvas-editor</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0</AppVersion></Properties>`
}

/** 生成媒体资源关系 XML 片段，供 document/header/footer 关系部件复用。 */
function createOoxmlMediaRelationshipsXml(
  elementList: IElement[] = [],
  mediaDescriptors: IOoxmlMediaDescriptor[] = collectOoxmlMediaDescriptors(
    elementList
  )
) {
  return mediaDescriptors
    .map(
      descriptor =>
        `<Relationship Id="${descriptor.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${descriptor.target}"/>`
    )
    .join('')
}

/** 生成行内对象关系 XML，统一输出图片和超链接等 run 级资源关系。 */
function createOoxmlInlineRelationshipsXml(elementList: IElement[] = []) {
  return `${createOoxmlMediaRelationshipsXml(elementList)}${createOoxmlHyperlinkRelationshipsXml(elementList)}`
}

/** 生成默认页眉页脚关系 XML 片段，连接 document.xml 与 header/footer 部件。 */
function createOoxmlHeaderFooterRelationshipsXml(
  data?: IEditorData,
  options?: IEditorOption
) {
  if (!data) return ''
  return createOoxmlHeaderFooterDescriptors(data, options)
    .map(
      descriptor =>
        `<Relationship Id="${descriptor.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${descriptor.kind}" Target="${descriptor.partName}"/>`
    )
    .join('')
}

/** 生成 Word 正文关系，挂载 styles、fontTable、numbering、媒体以及默认页眉页脚。 */
export function createOoxmlDocumentRelationshipsXml(
  elementList: IElement[] = [],
  data?: IEditorData,
  options?: IEditorOption
) {
  const inlineRelationships = createOoxmlInlineRelationshipsXml(elementList)
  const headerFooterRelationships = createOoxmlHeaderFooterRelationshipsXml(
    data,
    options
  )
  return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${headerFooterRelationships}${inlineRelationships}</Relationships>`
}

/** 生成页眉或页脚自身的关系部件，第一批用于其中的图片和超链接资源。 */
function createOoxmlHeaderFooterPartRelationshipsXml(elementList: IElement[] = []) {
  return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${createOoxmlInlineRelationshipsXml(elementList)}</Relationships>`
}

function createOoxmlHeaderFooterPartXml(
  descriptor: IOoxmlHeaderFooterDescriptor,
  options: IEditorOption
) {
  const variant = resolveOoxmlHeaderFooterPartVariant(descriptor)
  if (variant === 'textWatermarkHeader') {
    return createOoxmlHeaderXml(descriptor.elementList, options)
  }
  if (variant === 'header') {
    return `${XML_DECLARATION}<w:hdr ${WORD_DOCUMENT_NAMESPACES}>${createOoxmlBodyContentXml(descriptor.elementList, options)}</w:hdr>`
  }
  return createOoxmlFooterXml(descriptor.elementList, options)
}

/** 生成 DOCX 最小 package 部件集合，暂不负责 zip 打包。 */
export function createOoxmlPackageParts(
  data: IEditorData,
  options: IEditorOption
): IOoxmlPackageParts {
  const semanticElementList = collectOoxmlPackageSemanticElements(data)
  const headerFooterDescriptors = createOoxmlHeaderFooterDescriptors(data, options)
  const parts: IOoxmlPackageParts = {
    '[Content_Types].xml': createOoxmlContentTypesXml(data, options),
    '_rels/.rels': createOoxmlRootRelationshipsXml(),
    'word/document.xml': createOoxmlDocumentXml(data, options),
    'word/_rels/document.xml.rels': createOoxmlDocumentRelationshipsXml(
      data.main,
      data,
      options
    ),
    'word/styles.xml': createOoxmlStylesXml(
      semanticElementList,
      options,
      data.styles
    ),
    'word/fontTable.xml': createOoxmlFontTableXml(semanticElementList, options),
    'word/numbering.xml': createOoxmlNumberingXml(semanticElementList),
    'word/settings.xml': createOoxmlSettingsXml(options),
    'docProps/core.xml': createOoxmlCorePropertiesXml(),
    'docProps/app.xml': createOoxmlExtendedPropertiesXml()
  }
  headerFooterDescriptors.forEach(descriptor => {
    parts[`word/${descriptor.partName}`] = createOoxmlHeaderFooterPartXml(
      descriptor,
      options
    )
    if (hasOoxmlInlineRelationships(descriptor.elementList)) {
      parts[`word/_rels/${descriptor.partName}.rels`] =
        createOoxmlHeaderFooterPartRelationshipsXml(descriptor.elementList)
    }
  })
  collectOoxmlPackageMediaResources(data).forEach(resource => {
    parts[resource.path] = resource.bytes
  })
  return parts
}

/** 生成 DOCX 最小 package ZIP 字节，用于下载或保存为 .docx。 */
export function createOoxmlDocxBytes(
  data: IEditorData,
  options: IEditorOption
) {
  return createOoxmlZipPackage(createOoxmlPackageParts(data, options))
}

/** 生成 DOCX 最小 package Blob，浏览器可直接下载。 */
export function createOoxmlDocxPackageBlob(
  data: IEditorData,
  options: IEditorOption
) {
  return createOoxmlDocxBlob(createOoxmlPackageParts(data, options))
}
