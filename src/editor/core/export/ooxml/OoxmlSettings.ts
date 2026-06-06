import { IEditorOption } from '../../../interface/Editor'

/** OOXML 标准 XML 声明，保持 settings 部件可独立写入 DOCX package。 */
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

/** WordprocessingML 设置命名空间。 */
const WORD_SETTINGS_NAMESPACE =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

/** 生成镜像页边距设置，供奇偶页内外侧边距在 Word/WPS 中生效。 */
function createOoxmlMirrorMarginsSetting(options: IEditorOption) {
  return options.mirrorMargins ? '<w:mirrorMargins/>' : ''
}

/** 生成顶部装订线设置，配合 sectPr/pgMar 的 gutter 数值生效。 */
function createOoxmlGutterAtTopSetting(options: IEditorOption) {
  return options.gutterPosition === 'top' ? '<w:gutterAtTop/>' : ''
}

/** 生成 word/settings.xml，第一批先承载页面级全局设置。 */
export function createOoxmlSettingsXml(options: IEditorOption) {
  const settings = [
    createOoxmlMirrorMarginsSetting(options),
    createOoxmlGutterAtTopSetting(options)
  ].filter(Boolean)
  return `${XML_DECLARATION}<w:settings ${WORD_SETTINGS_NAMESPACE}>${settings.join('')}</w:settings>`
}
