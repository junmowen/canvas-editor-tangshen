/** ZIP local file header 签名。 */
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50

/** ZIP central directory file header 签名。 */
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50

/** ZIP end of central directory 签名。 */
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50

/** ZIP store 模式，当前 DOCX 导出只生成无压缩条目。 */
const ZIP_STORE_METHOD = 0

/** ZIP end of central directory 的固定字节长度。 */
const ZIP_END_OF_CENTRAL_DIRECTORY_SIZE = 22

/** DOCX 内部主文档部件路径。 */
export const OOXML_DOCUMENT_XML_PART = 'word/document.xml'

/** DOCX 内部全局设置部件路径。 */
export const OOXML_SETTINGS_XML_PART = 'word/settings.xml'

/** OOXML DOCX 导入结果，先保留 package 部件闭环，不做模型转换。 */
export interface IOoxmlImportedDocxPackage {
  /** 以 DOCX 包内相对路径为 key 的原始部件字节。 */
  parts: Record<string, Uint8Array>
  /** 以 DOCX 包内相对路径为 key 的 UTF-8 文本部件内容。 */
  textParts: Record<string, string>
  /** word/document.xml 的 XML 字符串，作为后续 WordprocessingML 映射入口。 */
  documentXml: string
}

/** 读取小端 16 位整数。 */
function readUint16(view: DataView, offset: number) {
  return view.getUint16(offset, true)
}

/** 读取小端 32 位整数。 */
function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, true)
}

/** 校验读取范围，避免损坏 ZIP 把解析游标带出字节数组。 */
function assertZipRange(bytes: Uint8Array, offset: number, length: number) {
  if (offset < 0 || length < 0 || offset + length > bytes.length) {
    throw new Error('Invalid OOXML DOCX zip structure')
  }
}

/** 创建只覆盖当前 Uint8Array 视窗的 DataView，避免复用底层 buffer 时偏移错误。 */
function createBytesView(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

/** 解码 ZIP 文件名和 OOXML 文本 part，当前导出器按 UTF-8 写入。 */
function decodeZipText(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes)
}

/** 判断 ZIP 部件是否需要按文本解码，媒体二进制保留在 parts 中避免内存峰值。 */
function isOoxmlTextPart(name: string) {
  const normalizedName = name.toLowerCase()
  return (
    normalizedName === '[content_types].xml' ||
    normalizedName.endsWith('.xml') ||
    normalizedName.endsWith('.rels')
  )
}

/** 在尾部查找 end of central directory，支持 ZIP comment。 */
function findEndOfCentralDirectoryOffset(bytes: Uint8Array) {
  const view = createBytesView(bytes)
  const minOffset = Math.max(0, bytes.length - 0xffff - ZIP_END_OF_CENTRAL_DIRECTORY_SIZE)
  for (
    let offset = bytes.length - ZIP_END_OF_CENTRAL_DIRECTORY_SIZE;
    offset >= minOffset;
    offset--
  ) {
    if (readUint32(view, offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset
    }
  }
  throw new Error('Missing OOXML DOCX zip end of central directory')
}

/** 从 local file header 定位真实内容起点，并校验中央目录与本地目录一致。 */
function readLocalFileContent(bytes: Uint8Array, payload: {
  /** 包内路径。 */
  name: string
  /** 压缩前后相同的 store 内容长度。 */
  contentLength: number
  /** local header 偏移量。 */
  localHeaderOffset: number
}) {
  const view = createBytesView(bytes)
  assertZipRange(bytes, payload.localHeaderOffset, 30)
  if (readUint32(view, payload.localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error(`Invalid OOXML DOCX local header: ${payload.name}`)
  }

  const nameLength = readUint16(view, payload.localHeaderOffset + 26)
  const extraLength = readUint16(view, payload.localHeaderOffset + 28)
  const nameStart = payload.localHeaderOffset + 30
  const contentStart = nameStart + nameLength + extraLength
  assertZipRange(bytes, nameStart, nameLength)
  assertZipRange(bytes, contentStart, payload.contentLength)

  const localName = decodeZipText(bytes.slice(nameStart, nameStart + nameLength))
  if (localName !== payload.name) {
    throw new Error(`OOXML DOCX central directory mismatch: ${payload.name}`)
  }

  return bytes.slice(contentStart, contentStart + payload.contentLength)
}

/** 解析当前导出器生成的无压缩 DOCX ZIP，并返回包内所有部件字节。 */
export function parseOoxmlDocxParts(bytes: Uint8Array) {
  const view = createBytesView(bytes)
  const endOffset = findEndOfCentralDirectoryOffset(bytes)
  const entryCount = readUint16(view, endOffset + 10)
  const centralDirectorySize = readUint32(view, endOffset + 12)
  const centralDirectoryOffset = readUint32(view, endOffset + 16)
  assertZipRange(bytes, centralDirectoryOffset, centralDirectorySize)

  const parts: Record<string, Uint8Array> = {}
  let cursor = centralDirectoryOffset
  for (let index = 0; index < entryCount; index++) {
    assertZipRange(bytes, cursor, 46)
    if (readUint32(view, cursor) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('Invalid OOXML DOCX central directory')
    }

    const compressionMethod = readUint16(view, cursor + 10)
    if (compressionMethod !== ZIP_STORE_METHOD) {
      throw new Error('Unsupported compressed OOXML DOCX zip entry')
    }

    const compressedSize = readUint32(view, cursor + 20)
    const uncompressedSize = readUint32(view, cursor + 24)
    if (compressedSize !== uncompressedSize) {
      throw new Error('Unsupported OOXML DOCX zip entry size')
    }

    const nameLength = readUint16(view, cursor + 28)
    const extraLength = readUint16(view, cursor + 30)
    const commentLength = readUint16(view, cursor + 32)
    const localHeaderOffset = readUint32(view, cursor + 42)
    const nameStart = cursor + 46
    assertZipRange(bytes, nameStart, nameLength)

    const name = decodeZipText(bytes.slice(nameStart, nameStart + nameLength))
    parts[name] = readLocalFileContent(bytes, {
      name,
      contentLength: uncompressedSize,
      localHeaderOffset
    })

    cursor = nameStart + nameLength + extraLength + commentLength
  }

  return parts
}

/** 把 DOCX 中的 package 部件按 UTF-8 解码，供 XML 导入第一阶段使用。 */
export function parseOoxmlDocxTextParts(bytes: Uint8Array) {
  const parts = parseOoxmlDocxParts(bytes)
  return parseOoxmlTextPartsFromParts(parts)
}

/** 把已解析的 package parts 中的文本部件按 UTF-8 解码。 */
export function parseOoxmlTextPartsFromParts(parts: Record<string, Uint8Array>) {
  return Object.keys(parts).reduce<Record<string, string>>((textParts, name) => {
    if (isOoxmlTextPart(name)) {
      textParts[name] = decodeZipText(parts[name])
    }
    return textParts
  }, {})
}

/** 从 DOCX 字节中提取 word/document.xml 字符串。 */
export function extractOoxmlDocumentXml(bytes: Uint8Array) {
  const textParts = parseOoxmlDocxTextParts(bytes)
  const documentXml = textParts[OOXML_DOCUMENT_XML_PART]
  if (!documentXml) {
    throw new Error('Missing OOXML word/document.xml part')
  }
  return documentXml
}

/** 解析 DOCX 字节为最小导入包，后续可在此基础上接 WordprocessingML 到内部模型。 */
export function importOoxmlDocxBytes(bytes: Uint8Array): IOoxmlImportedDocxPackage {
  const parts = parseOoxmlDocxParts(bytes)
  const textParts = parseOoxmlTextPartsFromParts(parts)
  const documentXml = textParts[OOXML_DOCUMENT_XML_PART]
  if (!documentXml) {
    throw new Error('Missing OOXML word/document.xml part')
  }
  return {
    parts,
    textParts,
    documentXml
  }
}
