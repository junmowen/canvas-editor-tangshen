import { ZERO } from '../../../../dataset/constant/Common'
import { IElement } from '../../../../interface/Element'

/** 折叠光标删除零宽 rowFlex 段落时，把上一段 rowFlex 继承给当前行。 */
export function inheritRowFlexOnCollapsedZeroBackspace(payload: {
  /** 是否折叠选区。 */
  isCollapsed: boolean
  /** 当前删除起点元素。 */
  startElement?: IElement
  /** 文档元素列表。 */
  elementList: IElement[]
  /** 当前删除起点索引。 */
  startIndex: number
  /** 当前行元素列表。 */
  rowElementList: IElement[] | null
}) {
  const {
    isCollapsed,
    startElement,
    elementList,
    startIndex,
    rowElementList
  } = payload
  if (
    !isCollapsed ||
    !startElement?.rowFlex ||
    startElement.value !== ZERO ||
    !rowElementList
  ) {
    return false
  }
  const preElement = elementList[startIndex - 1]
  rowElementList.forEach(element => {
    element.rowFlex = preElement?.rowFlex
  })
  return true
}
