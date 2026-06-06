/** OOXML 标准 XML 声明，保持各部件输出格式一致。 */
export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

/** WordprocessingML 主命名空间声明。 */
export const WORD_DOCUMENT_NAMESPACES =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
  'xmlns:v="urn:schemas-microsoft-com:vml" ' +
  'xmlns:w10="urn:schemas-microsoft-com:office:word" ' +
  'xmlns:o="urn:schemas-microsoft-com:office:office"'

/** 转义 XML 属性或文本内容，避免正文字符破坏 OOXML 结构。 */
export function escapeOoxmlText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 对字符串生成稳定正整数，供书签、内容控件等 OOXML id 派生使用。 */
export function createOoxmlStableNumber(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash || 1
}

/** 生成 Word 可接受的书签名称，避免中文、空格或符号破坏书签结构。 */
export function createOoxmlBookmarkName(titleId: string) {
  return `ce_title_${createOoxmlStableNumber(titleId)}`
}
