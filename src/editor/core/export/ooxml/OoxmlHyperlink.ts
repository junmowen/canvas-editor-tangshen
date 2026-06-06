import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'

/** 对字符串生成稳定哈希，用于超链接关系 id。 */
function createStableHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash || 1
}

/** 转义 XML 属性值，避免 URL 中的特殊字符破坏 relationships XML。 */
function escapeOoxmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 为超链接元素生成稳定 relationship id。 */
export function createOoxmlHyperlinkRelationshipId(element: IElement) {
  const seed = element.hyperlinkId || element.id || element.url || element.value || 'hyperlink'
  return `rIdHyperlink${createStableHash(seed)}`
}

/** 判断元素是否具备可导出的外部超链接。 */
export function hasOoxmlHyperlinkResource(element: IElement) {
  return element.type === ElementType.HYPERLINK && !!element.url
}

/** 递归收集正文、页眉页脚和表格单元格中的超链接资源。 */
export function collectOoxmlHyperlinkResources(elementList: IElement[] = []) {
  const resourceMap = new Map<string, { relationshipId: string; target: string }>()
  const walk = (list: IElement[]) => {
    for (const element of list) {
      if (hasOoxmlHyperlinkResource(element)) {
        resourceMap.set(createOoxmlHyperlinkRelationshipId(element), {
          relationshipId: createOoxmlHyperlinkRelationshipId(element),
          target: escapeOoxmlAttribute(element.url || '')
        })
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
  return [...resourceMap.values()]
}

/** 生成超链接 relationship XML 片段，TargetMode=External 表示外部链接。 */
export function createOoxmlHyperlinkRelationshipsXml(elementList: IElement[] = []) {
  return collectOoxmlHyperlinkResources(elementList)
    .map(
      resource =>
        `<Relationship Id="${resource.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${resource.target}" TargetMode="External"/>`
    )
    .join('')
}
