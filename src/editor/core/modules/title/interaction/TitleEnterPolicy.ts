import { IElement } from '../../../../interface/Element'

/** Enter 跨出标题上下文时，不继续复制锚点样式。 */
export function shouldCopyEnterAnchorAcrossTitleBoundary(payload: {
  /** 当前结束元素。 */
  endElement: IElement
  /** 下一个元素。 */
  nextElement?: IElement
}) {
  const { endElement, nextElement } = payload
  return !(
    endElement.titleId &&
    endElement.titleId !== nextElement?.titleId
  )
}
