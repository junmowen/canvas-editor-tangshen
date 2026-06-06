import { ImageDisplay } from '../../../dataset/enum/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import {
  getOoxmlRelationshipById,
  isOoxmlRelationshipType,
  OoxmlImportRelationshipMap
} from './OoxmlImportRelationships'
import { getOoxmlPrefixedAttribute } from './OoxmlDom'

/** OOXML EMU 到内部 px 的换算比例，必须和 DrawingML 图片导出侧 px->EMU 保持互逆。 */
const EMU_TO_PX = 1 / 9525

/** 支持根据扩展名恢复 data URL 的图片类型。 */
const OOXML_IMAGE_CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml'
}

/** 单次 OOXML 导入请求内的图片 data URL 缓存。 */
export type TOoxmlImageDataUrlCache = Map<string, string>

/** OOXML 图片导入选项，承接正文关系表和 package 媒体部件。 */
export interface IOoxmlImageImportOption {
  /** document.xml.rels 解析得到的 rId 映射。 */
  relationships?: OoxmlImportRelationshipMap
  /** DOCX package 原始部件字节，用于把 word/media 图片资源回填为 data URL。 */
  packageParts?: Record<string, Uint8Array>
  /** 单次导入请求内的媒体 data URL 缓存，避免同一 part 反复 base64 编码。 */
  imageDataUrlCache?: TOoxmlImageDataUrlCache
}

/** DrawingML 图片节点摘要，避免为 blip、extent/ext 重复扫描同一棵子树。 */
interface IOoxmlDrawingImageNodes {
  blip?: Element
  extent?: Element
  ext?: Element
  anchor?: Element
  positionH?: Element
  positionV?: Element
  wrapSquare?: Element
  wrapTight?: Element
  wrapNone?: Element
}

/** 一次遍历提取图片导入需要的 DrawingML 后代节点。 */
function collectOoxmlDrawingImageNodes(drawingElement: Element) {
  const nodes: IOoxmlDrawingImageNodes = {}
  const descendantElementList = drawingElement.getElementsByTagName('*')
  for (let index = 0; index < descendantElementList.length; index++) {
    const element = descendantElementList[index]
    if (!nodes.blip && element.localName === 'blip') {
      nodes.blip = element
    } else if (!nodes.extent && element.localName === 'extent') {
      nodes.extent = element
    } else if (!nodes.ext && element.localName === 'ext') {
      nodes.ext = element
    } else if (!nodes.anchor && element.localName === 'anchor') {
      nodes.anchor = element
    } else if (!nodes.positionH && element.localName === 'positionH') {
      nodes.positionH = element
    } else if (!nodes.positionV && element.localName === 'positionV') {
      nodes.positionV = element
    } else if (!nodes.wrapSquare && element.localName === 'wrapSquare') {
      nodes.wrapSquare = element
    } else if (!nodes.wrapTight && element.localName === 'wrapTight') {
      nodes.wrapTight = element
    } else if (!nodes.wrapNone && element.localName === 'wrapNone') {
      nodes.wrapNone = element
    }
    if (
      nodes.blip &&
      nodes.extent &&
      nodes.ext &&
      nodes.anchor &&
      nodes.positionH &&
      nodes.positionV &&
      (nodes.wrapSquare || nodes.wrapTight || nodes.wrapNone)
    ) {
      break
    }
  }
  return nodes
}

/** 把 DrawingML EMU 尺寸还原为编辑器内部像素。 */
function importOoxmlEmuToPx(value: string | null | undefined) {
  const emuValue = Number(value || 0)
  return Number.isFinite(emuValue) ? Math.round(emuValue * EMU_TO_PX) : 0
}

/** 读取 positionH/positionV 下的 posOffset，恢复 Word 浮动锚点坐标。 */
function parseOoxmlAnchorOffset(positionElement: Element | undefined) {
  if (!positionElement) return 0
  const descendantElementList = positionElement.getElementsByTagName('*')
  for (let index = 0; index < descendantElementList.length; index++) {
    const element = descendantElementList[index]
    if (element.localName === 'posOffset') {
      return importOoxmlEmuToPx(element.textContent)
    }
  }
  return 0
}

/** 根据 wp:anchor 的环绕节点恢复内部图片显示方式。 */
function parseOoxmlAnchorImageDisplay(nodes: IOoxmlDrawingImageNodes) {
  if (!nodes.anchor) return undefined
  if (nodes.wrapTight) return ImageDisplay.TIGHT
  if (nodes.wrapSquare) return ImageDisplay.SURROUND
  return nodes.anchor.getAttribute('behindDoc') === '1'
    ? ImageDisplay.FLOAT_BOTTOM
    : ImageDisplay.FLOAT_TOP
}

/** 从 wp:anchor 恢复内部浮动图片位置。 */
function parseOoxmlAnchorFloatPosition(nodes: IOoxmlDrawingImageNodes) {
  if (!nodes.anchor) return undefined
  return {
    x: parseOoxmlAnchorOffset(nodes.positionH),
    y: parseOoxmlAnchorOffset(nodes.positionV)
  }
}

/** 从 DrawingML 图片节点读取尺寸，优先使用 wp:extent，其次回退 pic:spPr/a:ext。 */
function parseOoxmlDrawingImageSize(nodes: IOoxmlDrawingImageNodes) {
  const extentElement = nodes.extent || nodes.ext
  return {
    width: importOoxmlEmuToPx(extentElement?.getAttribute('cx')),
    height: importOoxmlEmuToPx(extentElement?.getAttribute('cy'))
  }
}

/** 根据 relationship target 计算 DOCX package 中真实媒体部件路径。 */
function resolveOoxmlImagePackagePath(target: string | undefined) {
  if (!target) return ''
  const normalizedTarget = target.replace(/^\/+/, '')
  return normalizedTarget.startsWith('word/')
    ? normalizedTarget
    : `word/${normalizedTarget}`
}

/** 把图片字节编码为 base64，避免依赖 Node Buffer，浏览器测试环境也可运行。 */
function encodeOoxmlImageBytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

/** 从 package parts 中恢复图片 data URL，缺失资源时交给调用方回退 target。 */
function resolveOoxmlImageDataUrl(
  target: string | undefined,
  options: IOoxmlImageImportOption
) {
  const packagePath = resolveOoxmlImagePackagePath(target)
  const cachedDataUrl = packagePath ? options.imageDataUrlCache?.get(packagePath) : undefined
  if (cachedDataUrl) return cachedDataUrl
  const bytes = packagePath ? options.packageParts?.[packagePath] : undefined
  if (!bytes) return undefined
  const extension = packagePath.split('.').pop()?.toLowerCase() || ''
  const contentType = OOXML_IMAGE_CONTENT_TYPE_MAP[extension]
  if (!contentType) return undefined
  const dataUrl = `data:${contentType};base64,${encodeOoxmlImageBytesToBase64(bytes)}`
  options.imageDataUrlCache?.set(packagePath, dataUrl)
  return dataUrl
}

/** 解析 w:drawing 内联图片，恢复图片类型、关系 id、目标路径、data URL 和显示尺寸。 */
export function parseOoxmlDrawingImageElement(
  drawingElement: Element,
  options: IOoxmlImageImportOption
) {
  const imageNodes = collectOoxmlDrawingImageNodes(drawingElement)
  const relationshipId =
    getOoxmlPrefixedAttribute(imageNodes.blip, 'r', 'embed') || undefined
  if (!relationshipId) return []
  const relationship = getOoxmlRelationshipById(
    options.relationships || {},
    relationshipId
  )
  if (relationship && !isOoxmlRelationshipType(relationship, 'image')) {
    return []
  }
  const size = parseOoxmlDrawingImageSize(imageNodes)
  const dataUrl = resolveOoxmlImageDataUrl(relationship?.target, options)
  const imgDisplay = parseOoxmlAnchorImageDisplay(imageNodes)
  const imgFloatPosition = parseOoxmlAnchorFloatPosition(imageNodes)
  return [
    {
      type: ElementType.IMAGE,
      value: dataUrl || relationship?.target || relationshipId || '',
      id: relationshipId,
      ...(size.width ? { width: size.width } : {}),
      ...(size.height ? { height: size.height } : {}),
      ...(imgDisplay ? { imgDisplay } : {}),
      ...(imgFloatPosition ? { imgFloatPosition } : {})
    }
  ] as IElement[]
}
