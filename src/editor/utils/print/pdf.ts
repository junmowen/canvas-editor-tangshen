import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import { IPrintSvgDocumentPayload } from './svg/types'
import { createPrintSvgPageListFromDocument } from './svg/document'

/** PDF 字体配置。jsPDF 需要显式嵌入 TTF 才能稳定输出中文等 Unicode 文本。 */
export interface IPrintPdfFontFace {
  /** 字体族名称，需要和 SVG font-family 或 aliases 匹配。 */
  name: string
  /** 字体文件名，注册 VFS 时使用。未传时根据 name 自动生成。 */
  fileName?: string
  /** 字体二进制、base64 或 data URL。 */
  source?: ArrayBuffer | Uint8Array | string
  /** 字体文件地址，适合 demo 或业务项目放在静态资源目录后按需加载。 */
  url?: string
  /** 额外匹配的 SVG font-family 名称。 */
  aliases?: string[]
  /** 需要注册的字体样式。默认会注册 normal/bold/italic/bolditalic。 */
  styles?: string[]
}

/** PDF 导出选项，控制无弹窗 PDF 文件生成行为。 */
export interface IPrintPdfDocumentOption {
  /** 是否压缩 PDF 内容流。 */
  compress?: boolean
  /** PDF 使用的 TTF 字体列表；包含中文时必须传入至少一个支持中文的字体。 */
  fonts?: IPrintPdfFontFace[]
  /** 包含非 ASCII 文本但未提供字体时是否抛错，默认 true。 */
  requireFontsForUnicodeText?: boolean
}

function parsePrintSvgElement(svg: string) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const parserError = document.getElementsByTagName('parsererror')[0]
  if (parserError) {
    throw new Error('Invalid print SVG page')
  }
  const svgElement = document.documentElement
  if (!svgElement || svgElement.localName.toLowerCase() !== 'svg') {
    throw new Error('Invalid print SVG root')
  }
  return svgElement
}

function resolvePdfOrientation(width: number, height: number) {
  return width > height ? 'landscape' : 'portrait'
}

function isAsciiPdfFontName(value: string) {
  return /^[\x20-\x7E]+$/.test(value)
}

function resolvePdfFontInternalName(font: IPrintPdfFontFace, index: number) {
  const normalizedName = isAsciiPdfFontName(font.name)
    ? font.name.replace(/[^\w-]+/g, '')
    : ''
  return normalizedName || `CanvasEditorPdfFont${index + 1}`
}

function normalizePdfFontFileName(font: IPrintPdfFontFace) {
  if (font.fileName) {
    return font.fileName
  }
  if (font.url) {
    const urlPath = font.url.split(/[?#]/)[0]
    const urlFileName = urlPath.slice(urlPath.lastIndexOf('/') + 1)
    if (urlFileName) {
      return urlFileName
    }
  }
  return (
    `${font.name.replace(/[^\w.-]+/g, '-') || 'canvas-editor-font'}.ttf`
  )
}

function arrayBufferToBinaryString(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return binary
}

function resolvePdfFontDataUrlContent(value: string) {
  const match = /^data:[^;,]+(;base64)?,(.*)$/i.exec(value)
  if (!match) return null
  return match[1]
    ? atob(match[2])
    : arrayBufferToBinaryString(
        new TextEncoder().encode(decodeURIComponent(match[2]))
      )
}

async function resolvePdfFontBinary(font: IPrintPdfFontFace) {
  if (font.source instanceof ArrayBuffer || font.source instanceof Uint8Array) {
    return arrayBufferToBinaryString(font.source)
  }
  if (typeof font.source === 'string') {
    const dataUrlContent = resolvePdfFontDataUrlContent(font.source)
    return dataUrlContent || atob(font.source.replace(/\s+/g, ''))
  }
  if (font.url) {
    let response: Response
    try {
      response = await fetch(font.url)
    } catch (error) {
      throw new Error(
        `Failed to load PDF font "${font.name}" from ${font.url}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
    if (!response.ok) {
      throw new Error(
        `Failed to load PDF font "${font.name}" from ${font.url}: ${response.status} ${response.statusText}`
      )
    }
    return arrayBufferToBinaryString(await response.arrayBuffer())
  }
  throw new Error(`PDF font ${font.name} requires source or url`)
}

async function registerPdfFonts(pdf: jsPDF, fonts: IPrintPdfFontFace[] = []) {
  for (let index = 0; index < fonts.length; index++) {
    const font = fonts[index]
    const fileName = normalizePdfFontFileName(font)
    const internalName = resolvePdfFontInternalName(font, index)
    const binary = await resolvePdfFontBinary(font)
    const styles = font.styles?.length
      ? font.styles
      : ['normal', 'bold', 'italic', 'bolditalic']
    pdf.addFileToVFS(fileName, binary)
    styles.forEach(style => {
      pdf.addFont(fileName, internalName, style, undefined, 'Identity-H')
    })
  }
}

function normalizePdfFontFamilyName(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '')
}

function hasNonAsciiCharacter(value: string) {
  for (let index = 0; index < value.length; index++) {
    if (value.charCodeAt(index) > 127) {
      return true
    }
  }
  return false
}

function createPdfFontFamilyMap(fonts: IPrintPdfFontFace[] = []) {
  const familyMap = new Map<string, string>()
  const setFamily = (name: string, internalName: string) => {
    familyMap.set(name, internalName)
    familyMap.set(name.toLowerCase(), internalName)
  }
  fonts.forEach((font, index) => {
    const internalName = resolvePdfFontInternalName(font, index)
    setFamily(font.name, internalName)
    font.aliases?.forEach(alias => {
      setFamily(alias, internalName)
    })
  })
  return familyMap
}

function resolvePdfFontFamilyValue(
  value: string,
  familyMap: Map<string, string>,
  defaultFontName: string | null,
  textContent = ''
) {
  const fontFamilyList = value.split(',').map(normalizePdfFontFamilyName)
  const matchedFontName = fontFamilyList
    .map(fontFamily => familyMap.get(fontFamily) || familyMap.get(fontFamily.toLowerCase()))
    .find(Boolean)
  if (matchedFontName) {
    return matchedFontName
  }
  return (hasNonAsciiCharacter(value) || hasNonAsciiCharacter(textContent)) &&
    defaultFontName
    ? defaultFontName
    : value
}

function normalizeSvgPdfFontFamilies(
  svgElement: Element,
  fonts: IPrintPdfFontFace[] = []
) {
  if (!fonts.length) return
  const familyMap = createPdfFontFamilyMap(fonts)
  const defaultFontName = resolvePdfFontInternalName(fonts[0], 0)
  svgElement.querySelectorAll('[font-family]').forEach(element => {
    const fontFamily = element.getAttribute('font-family')
    if (!fontFamily) return
    const resolvedFontFamily = resolvePdfFontFamilyValue(
      fontFamily,
      familyMap,
      defaultFontName,
      element.textContent || ''
    )
    element.setAttribute('font-family', resolvedFontFamily)
    if (element instanceof SVGElement) {
      element.style.fontFamily = resolvedFontFamily
    }
  })
}

function getSvgTextContent(svgElement: Element) {
  return Array.from(svgElement.querySelectorAll('text'))
    .map(element => element.textContent || '')
    .join('')
}

function assertPdfFontsForSvgText(
  svgElement: Element,
  options: IPrintPdfDocumentOption
) {
  if (options.requireFontsForUnicodeText === false || options.fonts?.length) {
    return
  }
  if (hasNonAsciiCharacter(getSvgTextContent(svgElement))) {
    throw new Error(
      'PDF export contains Unicode text but no PDF fonts were provided. Pass TTF fonts through getPdfBlob({ fonts }) to avoid garbled or fallback text.'
    )
  }
}

/** 使用 SVG 打印页面直接生成 PDF Blob，不弹出浏览器打印框。 */
export async function createPdfBlobFromPrintSvgDocument(
  payload: IPrintSvgDocumentPayload,
  options: IPrintPdfDocumentOption = {}
) {
  const { width, height } = payload
  const orientation = resolvePdfOrientation(width, height)
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, height],
    compress: options.compress !== false,
    hotfixes: ['px_scaling']
  })
  await registerPdfFonts(pdf, options.fonts)
  if (options.fonts?.length) {
    pdf.setFont(resolvePdfFontInternalName(options.fonts[0], 0), 'normal')
  }
  const svgPageList = createPrintSvgPageListFromDocument(payload)
  for (let index = 0; index < svgPageList.length; index++) {
    if (index > 0) {
      pdf.addPage([width, height], orientation)
    }
    const svgElement = parsePrintSvgElement(svgPageList[index])
    assertPdfFontsForSvgText(svgElement, options)
    normalizeSvgPdfFontFamilies(svgElement, options.fonts)
    await svg2pdf(svgElement, pdf, {
      x: 0,
      y: 0,
      width,
      height
    })
  }
  return new Blob([pdf.output('arraybuffer')], {
    type: 'application/pdf'
  })
}
