import { ListStyle, ListType } from '../../../dataset/enum/List'
import { IElement } from '../../../interface/Element'

/** Word 编号命名空间。 */
const NUMBERING_NAMESPACES =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

/** 列表定义，用于生成 abstractNum 和 num。 */
interface IOoxmlNumberingDefinition {
  /** 内部列表 id。 */
  listId: string
  /** OOXML numId。 */
  numId: number
  /** OOXML abstractNumId。 */
  abstractNumId: number
  /** 内部列表类型。 */
  listType?: ListType
  /** 内部列表样式。 */
  listStyle?: ListStyle
}

/** 根据内部 listId 生成稳定编号 id，确保 document.xml 和 numbering.xml 对齐。 */
export function createOoxmlNumberingId(listId: string) {
  let hash = 0
  for (let index = 0; index < listId.length; index++) {
    hash = (hash * 31 + listId.charCodeAt(index)) >>> 0
  }
  return (hash % 2147480000) + 1
}

/** 判断列表是否应按项目符号导出。 */
function isBulletList(definition: IOoxmlNumberingDefinition) {
  return (
    definition.listType === ListType.UL ||
    definition.listStyle === ListStyle.DISC ||
    definition.listStyle === ListStyle.CIRCLE ||
    definition.listStyle === ListStyle.SQUARE ||
    definition.listStyle === ListStyle.CHECKBOX
  )
}

/** 获取项目符号文本。 */
function getBulletText(style?: ListStyle) {
  switch (style) {
    case ListStyle.CIRCLE:
      return '○'
    case ListStyle.SQUARE:
      return '▪'
    case ListStyle.CHECKBOX:
      return '☑'
    default:
      return '•'
  }
}

/** 生成单层级编号定义。 */
function createOoxmlLevel(definition: IOoxmlNumberingDefinition, level: number) {
  const left = 720 * (level + 1)
  const hanging = 360
  if (isBulletList(definition)) {
    return `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${getBulletText(definition.listStyle)}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${left}" w:hanging="${hanging}"/></w:pPr></w:lvl>`
  }
  return `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%${level + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${left}" w:hanging="${hanging}"/></w:pPr></w:lvl>`
}

/** 生成 abstractNum 定义，第一批固定生成 0-8 级。 */
function createOoxmlAbstractNum(definition: IOoxmlNumberingDefinition) {
  const levels = Array.from({ length: 9 }, (_, level) =>
    createOoxmlLevel(definition, level)
  ).join('')
  return `<w:abstractNum w:abstractNumId="${definition.abstractNumId}">${levels}</w:abstractNum>`
}

/** 生成 num 到 abstractNum 的绑定。 */
function createOoxmlNum(definition: IOoxmlNumberingDefinition) {
  return `<w:num w:numId="${definition.numId}"><w:abstractNumId w:val="${definition.abstractNumId}"/></w:num>`
}

/** 递归收集正文和表格单元格内的列表定义。 */
function collectOoxmlNumberingDefinitions(elementList: IElement[]) {
  const definitionMap = new Map<string, IOoxmlNumberingDefinition>()
  const walk = (list: IElement[]) => {
    for (const element of list) {
      if (element.listId && !definitionMap.has(element.listId)) {
        const id = createOoxmlNumberingId(element.listId)
        definitionMap.set(element.listId, {
          listId: element.listId,
          numId: id,
          abstractNumId: id,
          listType: element.listType,
          listStyle: element.listStyle
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
  return [...definitionMap.values()]
}

/** 生成段落编号属性。 */
export function createOoxmlNumberingProperties(element?: IElement) {
  if (!element?.listId) return ''
  const level = Math.max(0, Math.min(8, element.listLevel || 0))
  const numId = createOoxmlNumberingId(element.listId)
  return `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr>`
}

/** 生成 numbering.xml，第一批覆盖 decimal 和 bullet 列表。 */
export function createOoxmlNumberingXml(elementList: IElement[] = []) {
  const definitionList = collectOoxmlNumberingDefinitions(elementList)
  const abstractNums = definitionList.map(createOoxmlAbstractNum).join('')
  const nums = definitionList.map(createOoxmlNum).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${NUMBERING_NAMESPACES}>${abstractNums}${nums}</w:numbering>`
}
