import { ICatalog, ICatalogItem } from '../../../../interface/Catalog'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { walkElementTree } from '../../../shared/traversal/ElementTreeTraversal'

/** 获取目录调用载荷，聚合执行该操作所需的输入数据。 */
interface IGetCatalogPayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
}

/** 目录元素，描述文档元素在该场景下扩展的业务属性。 */
type ICatalogElement = IElement & {
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
}

/** 文档元素类型，决定元素参与布局、渲染和编辑时使用的处理分支。 */
enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  HYPERLINK = 'hyperlink',
  SUPERSCRIPT = 'superscript',
  SUBSCRIPT = 'subscript',
  SEPARATOR = 'separator',
  PAGE_BREAK = 'pageBreak',
  CONTROL = 'control',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  LATEX = 'latex',
  TAB = 'tab',
  DATE = 'date',
  BLOCK = 'block',
  TITLE = 'title',
  AREA = 'area',
  LIST = 'list'
}

/** 标题层级，映射一到六级标题的字号和 DOM 节点。 */
enum TitleLevel {
  FIRST = 'first',
  SECOND = 'second',
  THIRD = 'third',
  FOURTH = 'fourth',
  FIFTH = 'fifth',
  SIXTH = 'sixth'
}

const titleOrderNumberMapping: Record<TitleLevel, number> = {
  [TitleLevel.FIRST]: 1,
  [TitleLevel.SECOND]: 2,
  [TitleLevel.THIRD]: 3,
  [TitleLevel.FOURTH]: 4,
  [TitleLevel.FIFTH]: 5,
  [TitleLevel.SIXTH]: 6
}

// textlike element type 类型集合，用于快速判断元素类别。
const TEXTLIKE_ELEMENT_TYPE: ElementType[] = [
  ElementType.TEXT,
  ElementType.HYPERLINK,
  ElementType.SUBSCRIPT,
  ElementType.SUPERSCRIPT,
  ElementType.CONTROL,
  ElementType.DATE
]

// 零宽占位字符，用于表示空文本节点或占位元素。
const ZERO = '\u200B'

function isTextLikeElement(element: IElement): boolean {
  return !element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)
}

function getCatalog(payload: IGetCatalogPayload): ICatalog | null {
  const { elementList, positionList } = payload
  // 筛选标题
  const titleElementList: ICatalogElement[] = []
  const getElementInfo = (
    element: IElement,
    elementList: IElement[],
    position: number,
    fallbackPageNo?: number
  ) => {
    const titleId = element.titleId
    const level = element.level
    const titlePosition = positionList[position]
    const pageNo = titlePosition?.pageNo ?? fallbackPageNo
    if (pageNo === undefined) {
      return {
        position,
        titleElement: null
      }
    }
    const titleElement: ICatalogElement = {
      type: ElementType.TITLE,
      value: '',
      level,
      titleId,
      // chunk 增量排版期间 positionList 可能短暂缺少标题位置；有位置时才生成目录项。
      pageNo
    }
    const valueList: IElement[] = []
    while (position < elementList.length) {
      const titleE = elementList[position]
      if (titleId !== titleE.titleId) {
        position--
        break
      }
      valueList.push(titleE)
      position++
    }
    titleElement.value = valueList
      .filter(el => isTextLikeElement(el))
      .map(el => el.value)
      .join('')
      .replace(new RegExp(ZERO, 'g'), '')
    return { position, titleElement }
  }
  walkElementTree({
    elementList,
    visitor: ({ element, elementList, index, tableContext }): number | void => {
      if (tableContext && index === 0) return undefined
      if (!element.titleId) return undefined
      const tablePageNo = tableContext
        ? positionList[tableContext.tableIndex]?.pageNo
        : undefined
      const { position, titleElement } = getElementInfo(
        element,
        elementList,
        index,
        tablePageNo
      )
      if (titleElement) {
        titleElementList.push(titleElement)
      }
      return position + 1
    }
  })
  if (!titleElementList.length) return null
  // 查找到比最新元素大的标题时终止
  const recursiveInsert = (
    title: ICatalogElement,
    catalogItem: ICatalogItem
  ) => {
    const subCatalogItem =
      catalogItem.subCatalog[catalogItem.subCatalog.length - 1]
    const catalogItemLevel = titleOrderNumberMapping[subCatalogItem?.level]
    const titleLevel = titleOrderNumberMapping[title.level!]
    if (subCatalogItem && titleLevel > catalogItemLevel) {
      recursiveInsert(title, subCatalogItem)
    } else {
      catalogItem.subCatalog.push({
        id: title.titleId!,
        name: title.value,
        level: title.level!,
        pageNo: title.pageNo,
        subCatalog: []
      })
    }
  }
  // 循环标题组
  // 如果当前列表级别小于标题组最新标题级别：则递归查找最小级别并追加
  // 如果大于：则直接追加至当前标题组
  const catalog: ICatalog = []
  for (let e = 0; e < titleElementList.length; e++) {
    const title = titleElementList[e]
    const catalogItem = catalog[catalog.length - 1]
    const catalogItemLevel = titleOrderNumberMapping[catalogItem?.level]
    const titleLevel = titleOrderNumberMapping[title.level!]
    if (catalogItem && titleLevel > catalogItemLevel) {
      recursiveInsert(title, catalogItem)
    } else {
      catalog.push({
        id: title.titleId!,
        name: title.value,
        level: title.level!,
        pageNo: title.pageNo,
        subCatalog: []
      })
    }
  }
  return catalog
}

onmessage = evt => {
  try {
    const payload = <IGetCatalogPayload>evt.data
    const catalog = getCatalog(payload)
    postMessage(catalog)
  } catch {
    // 目录是异步辅助数据，增量排版期间遇到短暂不一致时返回空目录，不能让 worker 异常打断编辑链路。
    postMessage(null)
  }
}
