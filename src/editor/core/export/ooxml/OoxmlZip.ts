/** ZIP 文件头签名常量，使用无压缩 store 模式生成最小 DOCX 包。 */
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50

/** ZIP 中央目录文件头签名常量。 */
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50

/** ZIP 结束目录签名常量。 */
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50

/** ZIP store 模式，不做压缩，避免引入第三方依赖。 */
const ZIP_STORE_METHOD = 0

/** DOCX Blob 标准 MIME 类型。 */
export const OOXML_DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** ZIP 中单个文件的二进制描述。 */
interface IOoxmlZipEntry {
  /** 文件名文本，使用 DOCX package 内部相对路径。 */
  name: string
  /** 文件名 UTF-8 字节。 */
  nameBytes: Uint8Array
  /** 文件内容 UTF-8 字节。 */
  contentBytes: Uint8Array
  /** 文件内容 CRC32 校验值。 */
  crc32: number
  /** local header 在 ZIP 文件中的偏移量。 */
  localHeaderOffset: number
}

/** OOXML package part 内容，XML 使用字符串，媒体资源使用二进制字节。 */
export type OoxmlZipPartContent = string | Uint8Array

/** 把字符串编码为 UTF-8 字节。 */
function encodeUtf8(value: string) {
  return new TextEncoder().encode(value)
}

/** 创建 CRC32 查找表，用于 ZIP 目录校验。 */
function createCrc32Table() {
  const table: number[] = []
  for (let index = 0; index < 256; index++) {
    let code = index
    for (let bit = 0; bit < 8; bit++) {
      code = code & 1 ? 0xedb88320 ^ (code >>> 1) : code >>> 1
    }
    table[index] = code >>> 0
  }
  return table
}

/** CRC32 查找表只需要生成一次。 */
const CRC32_TABLE = createCrc32Table()

/** 计算 ZIP 所需的 CRC32 校验值。 */
export function computeOoxmlCrc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (let index = 0; index < bytes.length; index++) {
    crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** 写入 16 位小端整数。 */
function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

/** 写入 32 位小端整数。 */
function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true)
}

/** 创建定长字节块并交给调用方写入。 */
function createBytes(length: number, writer: (view: DataView) => void) {
  const bytes = new Uint8Array(length)
  writer(new DataView(bytes.buffer))
  return bytes
}

/** 生成 ZIP local file header。 */
function createLocalFileHeader(entry: IOoxmlZipEntry) {
  return createBytes(30, view => {
    writeUint32(view, 0, ZIP_LOCAL_FILE_HEADER_SIGNATURE)
    writeUint16(view, 4, 20)
    writeUint16(view, 6, 0x0800)
    writeUint16(view, 8, ZIP_STORE_METHOD)
    writeUint16(view, 10, 0)
    writeUint16(view, 12, 0)
    writeUint32(view, 14, entry.crc32)
    writeUint32(view, 18, entry.contentBytes.length)
    writeUint32(view, 22, entry.contentBytes.length)
    writeUint16(view, 26, entry.nameBytes.length)
    writeUint16(view, 28, 0)
  })
}

/** 生成 ZIP central directory file header。 */
function createCentralDirectoryHeader(entry: IOoxmlZipEntry) {
  return createBytes(46, view => {
    writeUint32(view, 0, ZIP_CENTRAL_DIRECTORY_SIGNATURE)
    writeUint16(view, 4, 20)
    writeUint16(view, 6, 20)
    writeUint16(view, 8, 0x0800)
    writeUint16(view, 10, ZIP_STORE_METHOD)
    writeUint16(view, 12, 0)
    writeUint16(view, 14, 0)
    writeUint32(view, 16, entry.crc32)
    writeUint32(view, 20, entry.contentBytes.length)
    writeUint32(view, 24, entry.contentBytes.length)
    writeUint16(view, 28, entry.nameBytes.length)
    writeUint16(view, 30, 0)
    writeUint16(view, 32, 0)
    writeUint16(view, 34, 0)
    writeUint16(view, 36, 0)
    writeUint32(view, 38, 0)
    writeUint32(view, 42, entry.localHeaderOffset)
  })
}

/** 生成 ZIP end of central directory。 */
function createEndOfCentralDirectory(payload: {
  /** ZIP 文件条目数量。 */
  entryCount: number
  /** 中央目录字节长度。 */
  centralDirectorySize: number
  /** 中央目录起始偏移量。 */
  centralDirectoryOffset: number
}) {
  return createBytes(22, view => {
    writeUint32(view, 0, ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE)
    writeUint16(view, 4, 0)
    writeUint16(view, 6, 0)
    writeUint16(view, 8, payload.entryCount)
    writeUint16(view, 10, payload.entryCount)
    writeUint32(view, 12, payload.centralDirectorySize)
    writeUint32(view, 16, payload.centralDirectoryOffset)
    writeUint16(view, 20, 0)
  })
}

/** 合并多个字节块为一个 Uint8Array。 */
function concatBytes(byteList: Uint8Array[]) {
  const totalLength = byteList.reduce((sum, bytes) => sum + bytes.length, 0)
  const output = new Uint8Array(totalLength)
  let offset = 0
  for (const bytes of byteList) {
    output.set(bytes, offset)
    offset += bytes.length
  }
  return output
}

/** 按路径排序，保证同一份文档生成稳定 ZIP 字节顺序。 */
function createZipEntries(parts: Record<string, OoxmlZipPartContent>) {
  let offset = 0
  return Object.keys(parts)
    .sort()
    .map(name => {
      const nameBytes = encodeUtf8(name)
      const content = parts[name]
      const contentBytes =
        typeof content === 'string' ? encodeUtf8(content) : content
      const entry: IOoxmlZipEntry = {
        name,
        nameBytes,
        contentBytes,
        crc32: computeOoxmlCrc32(contentBytes),
        localHeaderOffset: offset
      }
      offset += 30 + nameBytes.length + contentBytes.length
      return entry
    })
}

/** 把 OOXML package parts 打包为无压缩 ZIP 字节。 */
export function createOoxmlZipPackage(
  parts: Record<string, OoxmlZipPartContent>
) {
  const entryList = createZipEntries(parts)
  const localFileBytes = entryList.flatMap(entry => [
    createLocalFileHeader(entry),
    entry.nameBytes,
    entry.contentBytes
  ])
  const centralDirectoryOffset = localFileBytes.reduce(
    (sum, bytes) => sum + bytes.length,
    0
  )
  const centralDirectoryBytes = entryList.flatMap(entry => [
    createCentralDirectoryHeader(entry),
    entry.nameBytes
  ])
  const centralDirectorySize = centralDirectoryBytes.reduce(
    (sum, bytes) => sum + bytes.length,
    0
  )
  const endOfCentralDirectory = createEndOfCentralDirectory({
    entryCount: entryList.length,
    centralDirectorySize,
    centralDirectoryOffset
  })
  return concatBytes([
    ...localFileBytes,
    ...centralDirectoryBytes,
    endOfCentralDirectory
  ])
}

/** 把 ZIP 字节包装为 DOCX Blob。 */
export function createOoxmlDocxBlob(
  parts: Record<string, OoxmlZipPartContent>
) {
  return new Blob([createOoxmlZipPackage(parts)], {
    type: OOXML_DOCX_MIME_TYPE
  })
}
