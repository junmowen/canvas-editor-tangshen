import { WRAP, ZERO } from '../../../../dataset/constant/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'

export type TSeparatorUpdateResult = 'not-separator' | 'unchanged' | 'updated'

/** 更新已有分隔符线型。 */
export function applySeparatorDashArray(
  element: IElement | null | undefined,
  dashArray: number[]
): TSeparatorUpdateResult {
  if (!element || element.type !== ElementType.SEPARATOR) {
    return 'not-separator'
  }
  if (element.dashArray && element.dashArray.join() === dashArray.join()) {
    return 'unchanged'
  }
  element.dashArray = dashArray
  return 'updated'
}

/** 创建可插入文档的分隔符元素。 */
export function createSeparatorElement(dashArray: number[]): IElement {
  return {
    value: WRAP,
    type: ElementType.SEPARATOR,
    dashArray
  }
}

/** 判断是否应替换零宽行头元素插入分隔符。 */
export function shouldReplaceParagraphStartWithSeparator(payload: {
  /** 当前选区起点。 */
  startIndex: number
  /** 当前行头元素。 */
  startElement?: IElement | null
}) {
  return payload.startIndex !== 0 && payload.startElement?.value === ZERO
}
