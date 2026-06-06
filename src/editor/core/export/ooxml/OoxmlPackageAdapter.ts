import {
  HeaderFooterPageScope,
  IEditorData,
  IEditorOption
} from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { hasOoxmlHyperlinkResource } from './OoxmlHyperlink'
import {
  collectOoxmlMediaDescriptors,
  collectOoxmlMediaResources,
  TOoxmlMediaDecodeCache
} from './OoxmlMedia'
import { hasOoxmlTextWatermark } from './OoxmlWatermarkExportAdapter'

export type TOoxmlHeaderFooterKind = 'header' | 'footer'
export type TOoxmlHeaderFooterReferenceType = 'default' | 'first' | 'even'

export interface IOoxmlHeaderFooterDescriptor {
  kind: TOoxmlHeaderFooterKind
  referenceType: TOoxmlHeaderFooterReferenceType
  relationshipId: string
  partName: string
  elementList: IElement[]
  includesTextWatermark?: boolean
}

/** 判断页眉页脚是否有可导出的元素内容。 */
function hasOoxmlElementListContent(elementList?: IElement[]) {
  return !!elementList?.length
}

function getOoxmlScopedHeaderFooterElementList(
  data: IEditorData,
  kind: TOoxmlHeaderFooterKind,
  referenceType: TOoxmlHeaderFooterReferenceType
) {
  const scopedData =
    kind === 'header' ? data.headerPageScopes : data.footerPageScopes
  const preferredPageScopes: HeaderFooterPageScope[] =
    referenceType === 'default' ? ['odd', 'all'] : [referenceType]
  for (const pageScope of preferredPageScopes) {
    const scopeData = scopedData?.find(item => item.pageScope === pageScope)
    if (scopeData && hasOoxmlElementListContent(scopeData.elementList)) {
      return scopeData.elementList
    }
  }
  return undefined
}

/** 生成需要写入 package 的页眉页脚描述，默认页眉可承载文本水印。 */
export function createOoxmlHeaderFooterDescriptors(
  data: IEditorData,
  options?: IEditorOption
): IOoxmlHeaderFooterDescriptor[] {
  const descriptors: IOoxmlHeaderFooterDescriptor[] = []
  const referenceTypes: TOoxmlHeaderFooterReferenceType[] = [
    'default',
    'first',
    'even'
  ]
  ;(['header', 'footer'] as TOoxmlHeaderFooterKind[]).forEach(kind => {
    let index = 1
    referenceTypes.forEach(referenceType => {
      const elementList =
        getOoxmlScopedHeaderFooterElementList(data, kind, referenceType) || []
      const includesTextWatermark =
        kind === 'header' &&
        referenceType === 'default' &&
        hasOoxmlTextWatermark(options)
      if (!hasOoxmlElementListContent(elementList) && !includesTextWatermark) {
        return
      }
      descriptors.push({
        kind,
        referenceType,
        relationshipId: `rId${kind === 'header' ? 'Header' : 'Footer'}${index}`,
        partName: `${kind}${index}.xml`,
        elementList,
        includesTextWatermark
      })
      index++
    })
  })
  return descriptors
}

/** 生成 sectPr 中的页眉页脚引用。 */
export function createOoxmlHeaderFooterReferences(
  data: IEditorData,
  options: IEditorOption
) {
  return createOoxmlHeaderFooterDescriptors(data, options)
    .map(
      descriptor =>
        `<w:${descriptor.kind}Reference w:type="${descriptor.referenceType}" r:id="${descriptor.relationshipId}"/>`
    )
    .join('')
}

/** 汇总正文、页眉和页脚中的媒体资源，避免 package 漏写二进制部件。 */
export function collectOoxmlPackageMediaResources(data: IEditorData) {
  const resourceMap = new Map<
    string,
    ReturnType<typeof collectOoxmlMediaResources>[number]
  >()
  const decodeCache: TOoxmlMediaDecodeCache = new Map()
  const headerFooterElementLists = createOoxmlHeaderFooterDescriptors(data).map(
    descriptor => descriptor.elementList
  )
  ;[data.main, ...headerFooterElementLists].forEach(elementList => {
    collectOoxmlMediaResources(elementList, decodeCache).forEach(resource => {
      resourceMap.set(resource.path, resource)
    })
  })
  return [...resourceMap.values()]
}

/** 汇总正文、页眉和页脚元素，供 styles/numbering 等全局部件完整采集语义。 */
export function collectOoxmlPackageSemanticElements(data: IEditorData) {
  const headerFooterElementLists = createOoxmlHeaderFooterDescriptors(data).map(
    descriptor => descriptor.elementList
  )
  return [data.main, ...headerFooterElementLists].flat()
}

/** 轻量判断元素列表是否包含可导出的超链接资源。 */
function hasOoxmlHyperlinkRelationships(elementList: IElement[] = []) {
  const walk = (list: IElement[]): boolean => {
    for (const element of list) {
      if (hasOoxmlHyperlinkResource(element)) return true
      if (element.valueList?.length && walk(element.valueList)) return true
      if (element.trList?.length) {
        for (const tr of element.trList) {
          for (const td of tr.tdList) {
            if (walk(td.value || [])) return true
          }
        }
      }
    }
    return false
  }
  return walk(elementList)
}

/** 判断元素列表是否存在需要独立关系部件承载的行内资源。 */
export function hasOoxmlInlineRelationships(elementList: IElement[] = []) {
  return (
    !!collectOoxmlMediaDescriptors(elementList).length ||
    hasOoxmlHyperlinkRelationships(elementList)
  )
}

export type TOoxmlHeaderFooterPartVariant =
  | 'textWatermarkHeader'
  | 'header'
  | 'footer'

/** 解析页眉页脚部件的生成分支，主 package 只负责调用对应 XML 工厂。 */
export function resolveOoxmlHeaderFooterPartVariant(
  descriptor: IOoxmlHeaderFooterDescriptor
): TOoxmlHeaderFooterPartVariant {
  if (descriptor.kind === 'header' && descriptor.includesTextWatermark) {
    return 'textWatermarkHeader'
  }
  return descriptor.kind
}
