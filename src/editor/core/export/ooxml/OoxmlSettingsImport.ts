import { IEditorOption } from '../../../interface/Editor'
import {
  hasOoxmlChildElement,
  hasOoxmlParserError
} from './OoxmlDom'

/** 解析 word/settings.xml 为 DOM，空 settings 部件表示没有可导入配置。 */
function parseOoxmlSettingsXml(settingsXml: string) {
  if (!settingsXml) return undefined
  const document = new DOMParser().parseFromString(settingsXml, 'application/xml')
  if (hasOoxmlParserError(document)) {
    throw new Error('Invalid OOXML word/settings.xml')
  }
  return document.documentElement
}

/** 从 word/settings.xml 中导入页面级全局设置。 */
export function importOoxmlSettingsOptions(
  settingsXml: string
): Partial<IEditorOption> {
  const settingsElement = parseOoxmlSettingsXml(settingsXml)
  if (!settingsElement) return {}
  const hasMirrorMargins = hasOoxmlChildElement(
    settingsElement,
    'mirrorMargins'
  )
  const hasGutterAtTop = hasOoxmlChildElement(
    settingsElement,
    'gutterAtTop'
  )
  return {
    ...(hasMirrorMargins ? { mirrorMargins: true } : {}),
    ...(hasGutterAtTop ? { gutterPosition: 'top' as const } : {})
  }
}
