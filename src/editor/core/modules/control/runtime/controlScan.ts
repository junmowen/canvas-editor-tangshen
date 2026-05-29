import { IElement } from '../../../../interface/Element'

export function resolveControlBlockEndIndex(payload: {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 控件标识，用于关联同一控件的开始、值和结束元素。 */
  controlId: string
}): number {
  const { elementList, startIndex, controlId } = payload
  let endIndex = startIndex
  while (endIndex < elementList.length) {
    const nextElement = elementList[endIndex]
    if (nextElement.controlId !== controlId) break
    endIndex++
  }
  return endIndex
}
