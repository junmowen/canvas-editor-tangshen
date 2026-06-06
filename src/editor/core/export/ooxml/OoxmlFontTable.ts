import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'

/** fontTable.xml 使用的 XML 声明，保持字体部件可以独立写入 DOCX。 */
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

/** Word 字体表命名空间。 */
const FONT_TABLE_NAMESPACE =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

/** 转义字体名称，避免特殊字符破坏 fontTable XML 属性。 */
function escapeOoxmlFontName(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 读取默认字体，未配置时和编辑器默认配置保持一致。 */
function getOoxmlDefaultFont(options?: IEditorOption) {
  return options?.defaultFont || 'Microsoft YaHei'
}

/** 收集单个元素树中的显式字体，覆盖表格单元格等嵌套内容。 */
function collectOoxmlElementFonts(element: IElement, fontSet: Set<string>) {
  if (element.font) {
    fontSet.add(element.font)
  }
  // 业务控件、公式或富文本内部可能带 valueList，需要递归纳入字体表。
  if (element.valueList?.length) {
    element.valueList.forEach(child => collectOoxmlElementFonts(child, fontSet))
  }
  // 表格单元格内容是独立元素列表，导出字体表时必须一起扫描。
  if (element.trList?.length) {
    element.trList.forEach(tr => {
      tr.tdList.forEach(td => {
        ;(td.value || []).forEach(child => collectOoxmlElementFonts(child, fontSet))
      })
    })
  }
}

/** 收集文档中需要声明的字体，默认字体始终排在第一位。 */
export function collectOoxmlFontNames(
  elementList: IElement[] = [],
  options?: IEditorOption
) {
  const fontSet = new Set<string>()
  fontSet.add(getOoxmlDefaultFont(options))
  elementList.forEach(element => collectOoxmlElementFonts(element, fontSet))
  return [...fontSet].filter(Boolean)
}

/** 生成单个字体声明，第一批只声明字体名和中日韩字符提示，不嵌入字体文件。 */
function createOoxmlFontXml(fontName: string) {
  const font = escapeOoxmlFontName(fontName)
  return `<w:font w:name="${font}"><w:charset w:val="86"/><w:family w:val="auto"/><w:pitch w:val="variable"/></w:font>`
}

/** 生成 word/fontTable.xml，减少 WPS/Office 打开时的字体替换和发虚问题。 */
export function createOoxmlFontTableXml(
  elementList: IElement[] = [],
  options?: IEditorOption
) {
  const fonts = collectOoxmlFontNames(elementList, options)
    .map(createOoxmlFontXml)
    .join('')
  return `${XML_DECLARATION}<w:fonts ${FONT_TABLE_NAMESPACE}>${fonts}</w:fonts>`
}
