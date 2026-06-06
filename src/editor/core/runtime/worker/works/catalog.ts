import { ICatalog, ICatalogItem } from '../../../../interface/Catalog'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { ITitleTreeNode } from '../../../../interface/Title'
import { buildTitleTree } from '../../../modules/title/query/TitleTreeBuilder'

/** 获取目录调用载荷，聚合执行该操作所需的输入数据。 */
interface IGetCatalogPayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
}

/** 根据标题树生成目录结构，让目录 worker 统一消费 TS-06 标题父子树。 */
function getCatalog(payload: IGetCatalogPayload): ICatalog | null {
  const titleTree = buildTitleTree({
    elementList: payload.elementList,
    positionList: payload.positionList
  })
  if (!titleTree) {
    return null
  }
  const catalog = titleTree.rootList
    .map(node => createCatalogItem(node))
    .filter((item): item is ICatalogItem => Boolean(item))
  return catalog.length ? catalog : null
}

/** 把标题树节点转换成目录项；缺少页码的节点暂不进入目录，避免异步布局短暂不一致时报错。 */
function createCatalogItem(node: ITitleTreeNode): ICatalogItem | null {
  if (node.pageNo === null) {
    return null
  }
  return {
    id: node.id,
    name: node.name,
    level: node.level,
    pageNo: node.pageNo,
    subCatalog: node.childList
      .map(childNode => createCatalogItem(childNode))
      .filter((item): item is ICatalogItem => Boolean(item))
  }
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
