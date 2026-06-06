import { ImageDisplay } from '../../../dataset/enum/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'

/** 图片像素到 EMU 的换算，OOXML DrawingML 使用 EMU 描述尺寸。 */
const PX_TO_EMU = 9525

/** 支持导出的 data URL 图片类型。 */
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}

/** OOXML 媒体资源描述。 */
export interface IOoxmlMediaDescriptor {
  /** 图片元素稳定关系 id。 */
  relationshipId: string
  /** relationship target，相对 word/document.xml。 */
  target: string
  /** package 内完整路径。 */
  path: string
  /** MIME 类型。 */
  contentType: string
  /** data URL 是否为 base64 编码。 */
  isBase64: boolean
  /** data URL payload，资源写入 package 时再解码。 */
  payload: string
  /** 解码缓存 key。 */
  cacheKey: string
}

/** OOXML 媒体资源描述。 */
export interface IOoxmlMediaResource extends IOoxmlMediaDescriptor {
  /** 图片二进制字节。 */
  bytes: Uint8Array
}

/** data URL 解码缓存，同一图片多处出现时复用字节，降低导出内存峰值。 */
export type TOoxmlMediaDecodeCache = Map<string, Uint8Array>

/** 把像素转换为 OOXML EMU。 */
function convertPxToEmu(value: number | undefined) {
  return Math.max(1, Math.round((value || 1) * PX_TO_EMU))
}

/** 对字符串生成稳定哈希，用于关系 id 和 docPr id。 */
function createStableHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash || 1
}

/** 解析 data URL，第一批图片导出只处理内嵌 data URL。 */
function parseImageDataUrl(value: string) {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/i.exec(value || '')
  if (!match) return null
  const contentType = match[1].toLowerCase()
  const extension = MIME_EXTENSION_MAP[contentType]
  if (!extension) return null
  return {
    contentType,
    extension,
    isBase64: Boolean(match[2]),
    payload: match[3]
  }
}

/** 把 data URL payload 转换为二进制字节。 */
function decodeImagePayload(
  payload: string,
  isBase64: boolean,
  cacheKey?: string,
  decodeCache?: TOoxmlMediaDecodeCache
) {
  const cachedBytes = cacheKey ? decodeCache?.get(cacheKey) : undefined
  if (cachedBytes) {
    return cachedBytes
  }
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  if (cacheKey) {
    decodeCache?.set(cacheKey, bytes)
  }
  return bytes
}

/** 为图片元素生成稳定关系 id。 */
export function createOoxmlImageRelationshipId(element: IElement) {
  const seed = element.id || element.value || 'image'
  return `rIdImage${createStableHash(seed)}`
}

/** 为图片元素生成 DrawingML docPr id。 */
function createOoxmlImageDocPrId(element: IElement) {
  const seed = element.id || element.value || 'image'
  return createStableHash(seed)
}

/** 判断图片是否需要导出为 Word 浮动锚点。 */
function isOoxmlFloatingImage(element: IElement) {
  return (
    element.imgDisplay === ImageDisplay.SURROUND ||
    element.imgDisplay === ImageDisplay.TIGHT ||
    element.imgDisplay === ImageDisplay.FLOAT_TOP ||
    element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
  )
}

/** 从单个图片元素创建媒体描述，不提前解码图片 payload。 */
function createOoxmlMediaDescriptor(element: IElement) {
  if (element.type !== ElementType.IMAGE) return null
  const parsed = parseImageDataUrl(element.value)
  if (!parsed) return null
  const relationshipId = createOoxmlImageRelationshipId(element)
  const fileName = `${relationshipId}.${parsed.extension}`
  const cacheKey = `${parsed.contentType}|${parsed.isBase64 ? 'base64' : 'uri'}|${
    parsed.payload
  }`
  return {
    relationshipId,
    target: `media/${fileName}`,
    path: `word/media/${fileName}`,
    contentType: parsed.contentType,
    isBase64: parsed.isBase64,
    payload: parsed.payload,
    cacheKey
  }
}

/** 从媒体描述创建二进制资源。 */
function createOoxmlMediaResource(
  descriptor: IOoxmlMediaDescriptor,
  decodeCache?: TOoxmlMediaDecodeCache
) {
  return {
    ...descriptor,
    bytes: decodeImagePayload(
      descriptor.payload,
      descriptor.isBase64,
      descriptor.cacheKey,
      decodeCache
    )
  }
}

/** 递归收集正文和表格单元格中的图片媒体描述，不解码 data URL payload。 */
export function collectOoxmlMediaDescriptors(
  elementList: IElement[] = []
) {
  const descriptorMap = new Map<string, IOoxmlMediaDescriptor>()
  const walk = (list: IElement[]) => {
    for (const element of list) {
      const descriptor = createOoxmlMediaDescriptor(element)
      if (descriptor) {
        descriptorMap.set(descriptor.relationshipId, descriptor)
      }
      if (element.valueList?.length) {
        walk(element.valueList)
      }
      if (element.trList?.length) {
        element.trList.forEach(tr => {
          tr.tdList.forEach(td => walk(td.value || []))
        })
      }
    }
  }
  walk(elementList)
  return [...descriptorMap.values()]
}

/** 递归收集正文和表格单元格中的图片媒体资源。 */
export function collectOoxmlMediaResources(
  elementList: IElement[] = [],
  decodeCache: TOoxmlMediaDecodeCache = new Map()
) {
  return collectOoxmlMediaDescriptors(elementList).map(descriptor =>
    createOoxmlMediaResource(descriptor, decodeCache)
  )
}

/** 判断图片元素是否具备可导出的 data URL 资源。 */
export function hasOoxmlImageResource(element: IElement) {
  return element.type === ElementType.IMAGE && !!parseImageDataUrl(element.value)
}

/** 生成 DrawingML 图片主体，供 inline 和 anchor 复用。 */
function createOoxmlPictureGraphic(payload: {
  /** 图片关系 id。 */
  relationshipId: string
  /** 图片宽度，EMU。 */
  cx: number
  /** 图片高度，EMU。 */
  cy: number
  /** DrawingML docPr id。 */
  docPrId: number
}) {
  const { relationshipId, cx, cy, docPrId } = payload
  return `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="Image ${docPrId}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`
}

/** 生成浮动图片环绕 XML。 */
function createOoxmlImageAnchorWrap(element: IElement, cx: number, cy: number) {
  if (element.imgDisplay === ImageDisplay.TIGHT) {
    return `<wp:wrapTight wrapText="bothSides"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="${cx}" y="0"/><wp:lineTo x="${cx}" y="${cy}"/><wp:lineTo x="0" y="${cy}"/></wp:wrapPolygon></wp:wrapTight>`
  }
  if (element.imgDisplay === ImageDisplay.SURROUND) {
    return '<wp:wrapSquare wrapText="bothSides"/>'
  }
  return '<wp:wrapNone/>'
}

/** 生成浮动图片 DrawingML run。 */
function createOoxmlFloatingImageRun(payload: {
  /** 图片元素。 */
  element: IElement
  /** 图片关系 id。 */
  relationshipId: string
  /** 图片宽度，EMU。 */
  cx: number
  /** 图片高度，EMU。 */
  cy: number
  /** DrawingML docPr id。 */
  docPrId: number
}) {
  const { element, relationshipId, cx, cy, docPrId } = payload
  const x = convertPxToEmu(element.imgFloatPosition?.x || 0)
  const y = convertPxToEmu(element.imgFloatPosition?.y || 0)
  const behindDoc = element.imgDisplay === ImageDisplay.FLOAT_BOTTOM ? '1' : '0'
  const wrapXml = createOoxmlImageAnchorWrap(element, cx, cy)
  const graphicXml = createOoxmlPictureGraphic({
    relationshipId,
    cx,
    cy,
    docPrId
  })
  return `<w:r><w:drawing><wp:anchor simplePos="0" relativeHeight="251659264" behindDoc="${behindDoc}" locked="0" layoutInCell="1" allowOverlap="1" distT="0" distB="0" distL="0" distR="0"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/>${wrapXml}<wp:docPr id="${docPrId}" name="Image ${docPrId}"/>${graphicXml}</wp:anchor></w:drawing></w:r>`
}

/** 生成图片 DrawingML run，浮动/环绕图片导出为 wp:anchor，普通图片导出为 wp:inline。 */
export function createOoxmlImageRun(element: IElement) {
  const relationshipId = createOoxmlImageRelationshipId(element)
  const cx = convertPxToEmu(element.width)
  const cy = convertPxToEmu(element.height)
  const docPrId = createOoxmlImageDocPrId(element)
  if (isOoxmlFloatingImage(element)) {
    return createOoxmlFloatingImageRun({
      element,
      relationshipId,
      cx,
      cy,
      docPrId
    })
  }
  const graphicXml = createOoxmlPictureGraphic({
    relationshipId,
    cx,
    cy,
    docPrId
  })
  return `<w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPrId}" name="Image ${docPrId}"/>${graphicXml}</wp:inline></w:drawing></w:r>`
}
