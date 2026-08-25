import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import {
  escapePrintSvgAttr,
  escapePrintSvgText,
  normalizePrintSvgOpacity,
  resolvePrintSvgInlineTextOffsetY
} from './core'
import {
  createPrintSvgControlContent,
  isPrintSvgControlPosition,
  resolvePrintSvgInlineImagePayload,
  resolvePrintSvgLatexPayload,
  resolvePrintSvgInlineRenderKind
} from './PrintSvgInlineRenderAdapter'
import { createPrintSvgChartGraphic } from '../../../core/modules/chart-graphics/render/ChartGraphicSvgExporter'
import { createPrintSvgFormula } from './formula'

/** 创建 SVG 文本节点，按当前位置样式输出矢量文字。 */
function createPrintSvgText(position: IElementPosition, text = position.value) {
  if (!text) return ''
  const element = position.element || ({} as IElement)
  const x = position.coordinate.leftTop[0]
  const y =
    position.coordinate.leftTop[1] +
    position.ascent +
    resolvePrintSvgInlineTextOffsetY(position)
  const size = element.actualSize || element.size || 16
  const fill = element.color || '#000000'
  const font = escapePrintSvgText(element.font || 'Microsoft YaHei')
  const fontWeight = element.bold ? ' font-weight="700"' : ''
  const fontStyle = element.italic ? ' font-style="italic"' : ''
  const textStroke = element.textOutline
    ? ` stroke="${escapePrintSvgAttr(element.textOutline.color || fill)}" stroke-width="${element.textOutline.width || 1}"${element.textOutline.hollow ? ' fill="none"' : ''}`
    : ''
  const textShadow = element.textShadow
    ? ` filter="drop-shadow(${element.textShadow.offsetX || 0}px ${element.textShadow.offsetY || 0}px ${element.textShadow.blur || 0}px ${escapePrintSvgAttr(element.textShadow.color || '#000000')})"`
    : element.textGlow
      ? ` filter="drop-shadow(0 0 ${element.textGlow.blur || 0}px ${escapePrintSvgAttr(element.textGlow.color || fill)})"`
      : ''
  const textDecoration =
    element.underline || element.strikeout
      ? ` text-decoration="${element.underline ? 'underline' : 'line-through'}"`
      : ''
  const fillAttr = element.textOutline?.hollow ? '' : ` fill="${fill}"`
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}"${fillAttr}${fontWeight}${fontStyle}${textDecoration}${textStroke}${textShadow}>${escapePrintSvgText(text)}</text>`
}

/** 创建 SVG 图片节点，支持正文图片、表格图片和浮动图片打印。 */
export function createPrintSvgImage(payload: {
  /** 图片来源地址，通常是 dataURL。 */
  src: string
  /** 横向起点。 */
  x: number
  /** 纵向起点。 */
  y: number
  /** 图片宽度。 */
  width: number
  /** 图片高度。 */
  height: number
  /** 透明度。 */
  opacity?: number
}) {
  const { src, x, y, width, height, opacity } = payload
  if (!src || !width || !height) return ''
  const opacityAttr =
    opacity === undefined ? '' : ` opacity="${normalizePrintSvgOpacity(opacity)}"`
  return `<image href="${escapePrintSvgAttr(src)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none"${opacityAttr}/>`
}

/** 创建行内图片 SVG 节点，坐标沿用现有 worker 快照的图片绘制规则。 */
function createPrintSvgInlineImage(position: IElementPosition) {
  const imagePayload = resolvePrintSvgInlineImagePayload(position)
  if (!imagePayload) return ''
  return createPrintSvgImage({
    ...imagePayload
  })
}

/** 创建 LaTeX 公式 SVG 节点，优先使用结构化公式生成的 SVG 数据。 */
function createPrintSvgLatex(position: IElementPosition) {
  const latexPayload = resolvePrintSvgLatexPayload(position)
  if (!latexPayload) return ''
  if (latexPayload.kind === 'text') {
    return createPrintSvgFormula(position) || createPrintSvgText(position, latexPayload.text)
  }
  return createPrintSvgImage({
    src: latexPayload.src,
    x: position.coordinate.leftTop[0],
    y: position.coordinate.leftTop[1],
    width: latexPayload.width,
    height: latexPayload.height
  })
}

/** 创建 SVG 高亮矩形，保证高亮文本打印时仍有背景。 */
function createPrintSvgHighlight(position: IElementPosition) {
  const highlight = position.element?.highlight
  if (!highlight) return ''
  const { leftTop, rightBottom } = position.coordinate
  return `<rect x="${leftTop[0]}" y="${leftTop[1]}" width="${Math.max(0, rightBottom[0] - leftTop[0])}" height="${Math.max(0, rightBottom[1] - leftTop[1])}" fill="${escapePrintSvgText(highlight)}"/>`
}

/** 把同一页的布局位置转换为 SVG 内容。 */
export function createPrintSvgPageContent(
  positionList: IElementPosition[],
  options?: DeepRequired<IEditorOption>
) {
  const contentList: string[] = []
  let index = 0
  while (index < positionList.length) {
    const position = positionList[index]
    const renderKind = resolvePrintSvgInlineRenderKind(position)
    if (renderKind === 'control') {
      const controlId = position.element?.controlId
      const controlPositionList: IElementPosition[] = []
      while (
        index < positionList.length &&
        positionList[index].element?.controlId === controlId &&
        isPrintSvgControlPosition(positionList[index])
      ) {
        controlPositionList.push(positionList[index])
        index++
      }
      contentList.push(
        createPrintSvgControlContent(
          controlPositionList,
          {
            createText: createPrintSvgText,
            createHighlight: createPrintSvgHighlight
          },
          options
        )
      )
      continue
    }
    if (renderKind !== 'skip') {
      contentList.push(createPrintSvgHighlight(position))
      if (renderKind === 'chartGraphic') {
        contentList.push(createPrintSvgChartGraphic(position))
      } else if (renderKind === 'image') {
        contentList.push(createPrintSvgInlineImage(position))
      } else if (renderKind === 'latex') {
        contentList.push(createPrintSvgLatex(position))
      } else {
        contentList.push(createPrintSvgText(position))
      }
    }
    index++
  }
  return contentList.join('')
}
