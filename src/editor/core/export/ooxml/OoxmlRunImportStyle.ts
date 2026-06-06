import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import {
  getOoxmlAttribute,
  getOoxmlChildElement as getFirstChildElement
} from './OoxmlDom'

const HALF_POINT_TO_PX = 2 / 3
const TWIP_TO_PX = 1 / 15

export interface IOoxmlRunImportStyle {
  font?: string
  size?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikeout?: boolean
  color?: string
  highlight?: string
  textScale?: number
  letterSpacing?: number
  textPosition?: number
  textOutline?: IElement['textOutline']
  textShadow?: IElement['textShadow']
  textCombine?: boolean
  verticalType?: ElementType.SUPERSCRIPT | ElementType.SUBSCRIPT
}

function isOoxmlToggleEnabled(element: Element | undefined) {
  if (!element) return false
  const value = getOoxmlAttribute(element, 'val')
  return value !== '0' && value !== 'false' && value !== 'off'
}

function importOoxmlHexColor(value: string | null | undefined) {
  if (!value || value === 'auto') return undefined
  return `#${value.toUpperCase()}`
}

function importOoxmlTwipToPx(value: string | null | undefined) {
  const twipValue = Number(value || 0)
  return Number.isFinite(twipValue) ? Math.round(twipValue * TWIP_TO_PX) : 0
}

function importOoxmlHighlightColor(value: string | null | undefined) {
  const colorMap: Record<string, string> = {
    black: '#000000',
    blue: '#0000FF',
    cyan: '#00FFFF',
    green: '#00FF00',
    magenta: '#FF00FF',
    red: '#FF0000',
    yellow: '#FFFF00',
    white: '#FFFFFF',
    darkBlue: '#00008B',
    darkCyan: '#008B8B',
    darkGreen: '#006400',
    darkMagenta: '#8B008B',
    darkRed: '#8B0000',
    darkYellow: '#808000',
    darkGray: '#A9A9A9',
    lightGray: '#D3D3D3'
  }
  if (!value || value === 'none') return undefined
  return colorMap[value] || importOoxmlHexColor(value)
}

function importOoxmlFontSize(value: string | null | undefined) {
  const halfPoint = Number(value || 0)
  return Number.isFinite(halfPoint) && halfPoint > 0
    ? Math.round(halfPoint * HALF_POINT_TO_PX)
    : undefined
}

function importOoxmlTextPosition(value: string | null | undefined) {
  const halfPoint = Number(value || 0)
  return Number.isFinite(halfPoint) && halfPoint !== 0
    ? Math.round(halfPoint * HALF_POINT_TO_PX)
    : undefined
}

function importOoxmlLetterSpacing(value: string | null | undefined) {
  const spacing = importOoxmlTwipToPx(value)
  return spacing || undefined
}

function importOoxmlRunFont(runProperties: Element | undefined) {
  const fonts = getFirstChildElement(runProperties, 'rFonts')
  if (!fonts) return undefined
  return (
    getOoxmlAttribute(fonts, 'eastAsia') ||
    getOoxmlAttribute(fonts, 'ascii') ||
    getOoxmlAttribute(fonts, 'hAnsi') ||
    undefined
  )
}

function importOoxmlVerticalType(runProperties: Element | undefined) {
  const verticalAlign = getFirstChildElement(runProperties, 'vertAlign')
  const value = getOoxmlAttribute(verticalAlign, 'val')
  if (value === 'superscript') return ElementType.SUPERSCRIPT
  if (value === 'subscript') return ElementType.SUBSCRIPT
  return undefined
}

export function parseOoxmlRunImportStyle(
  runElement: Element
): IOoxmlRunImportStyle {
  const runProperties = getFirstChildElement(runElement, 'rPr')
  if (!runProperties) return {}

  const underline = getFirstChildElement(runProperties, 'u')
  const color = getFirstChildElement(runProperties, 'color')
  const shading = getFirstChildElement(runProperties, 'shd')
  const highlight = getFirstChildElement(runProperties, 'highlight')
  const scale = getFirstChildElement(runProperties, 'w')
  const spacing = getFirstChildElement(runProperties, 'spacing')
  const position = getFirstChildElement(runProperties, 'position')
  const eastAsianLayout = getFirstChildElement(runProperties, 'eastAsianLayout')
  const textScale = Number(getOoxmlAttribute(scale, 'val') || 0)

  return {
    font: importOoxmlRunFont(runProperties),
    size: importOoxmlFontSize(
      getOoxmlAttribute(getFirstChildElement(runProperties, 'sz'), 'val')
    ),
    bold: isOoxmlToggleEnabled(getFirstChildElement(runProperties, 'b')) || undefined,
    italic: isOoxmlToggleEnabled(getFirstChildElement(runProperties, 'i')) || undefined,
    underline:
      underline && getOoxmlAttribute(underline, 'val') !== 'none'
        ? true
        : undefined,
    strikeout:
      isOoxmlToggleEnabled(getFirstChildElement(runProperties, 'strike')) ||
      undefined,
    color: importOoxmlHexColor(getOoxmlAttribute(color, 'val')),
    highlight:
      importOoxmlHexColor(getOoxmlAttribute(shading, 'fill')) ||
      importOoxmlHighlightColor(getOoxmlAttribute(highlight, 'val')),
    textScale:
      Number.isFinite(textScale) && textScale > 0 ? textScale : undefined,
    letterSpacing: importOoxmlLetterSpacing(getOoxmlAttribute(spacing, 'val')),
    textPosition: importOoxmlTextPosition(getOoxmlAttribute(position, 'val')),
    textOutline: getFirstChildElement(runProperties, 'outline')
      ? { hollow: true }
      : undefined,
    textShadow: getFirstChildElement(runProperties, 'shadow') ? {} : undefined,
    textCombine:
      getOoxmlAttribute(eastAsianLayout, 'combine') === '1' || undefined,
    verticalType: importOoxmlVerticalType(runProperties)
  }
}

export function applyOoxmlRunImportStyle(
  element: IElement,
  style: IOoxmlRunImportStyle
) {
  const styledElement: IElement = {
    ...element,
    ...(style.font ? { font: style.font } : {}),
    ...(style.size ? { size: style.size } : {}),
    ...(style.bold ? { bold: style.bold } : {}),
    ...(style.italic ? { italic: style.italic } : {}),
    ...(style.underline ? { underline: style.underline } : {}),
    ...(style.strikeout ? { strikeout: style.strikeout } : {}),
    ...(style.color ? { color: style.color } : {}),
    ...(style.highlight ? { highlight: style.highlight } : {}),
    ...(style.textScale ? { textScale: style.textScale } : {}),
    ...(style.letterSpacing ? { letterSpacing: style.letterSpacing } : {}),
    ...(style.textPosition ? { textPosition: style.textPosition } : {}),
    ...(style.textOutline ? { textOutline: style.textOutline } : {}),
    ...(style.textShadow ? { textShadow: style.textShadow } : {}),
    ...(style.textCombine ? { textCombine: style.textCombine } : {})
  }

  if (style.verticalType && !styledElement.type) {
    styledElement.type = style.verticalType
  }
  return styledElement
}
