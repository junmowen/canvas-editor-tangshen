import { IPrintPdfFontFace } from '../editor/utils/print'

const DEMO_CJK_FONT_ALIASES = [
  '微软雅黑',
  'Microsoft YaHei',
  'MicrosoftYaHei',
  'DengXian',
  '等线',
  'SimSun',
  '宋体',
  '华文宋体',
  '华文黑体',
  '华文仿宋',
  '华文楷体',
  '华文琥珀',
  '华文隶书',
  '华文新魏',
  '华文行楷',
  '华文中宋',
  '华文彩云',
  'Arial',
  'Segoe UI',
  'Fantasy',
  'Times New Roman',
  'serif',
  'sans-serif'
]

/** Demo PDF 导出使用本机提取的微软雅黑 TTF，生产项目应传入自有授权字体。 */
export function createDemoPdfFonts(
  resolveAssetUrl: (path: string) => string
): IPrintPdfFontFace[] {
  return [
    {
      name: 'Microsoft YaHei',
      fileName: 'MicrosoftYaHei-Regular.ttf',
      url: resolveAssetUrl('fonts/MicrosoftYaHei-Regular.ttf'),
      styles: ['normal', 'italic'],
      aliases: DEMO_CJK_FONT_ALIASES
    },
    {
      name: 'Microsoft YaHei',
      fileName: 'MicrosoftYaHei-Bold.ttf',
      url: resolveAssetUrl('fonts/MicrosoftYaHei-Bold.ttf'),
      styles: ['bold', 'bolditalic'],
      aliases: DEMO_CJK_FONT_ALIASES
    }
  ]
}
