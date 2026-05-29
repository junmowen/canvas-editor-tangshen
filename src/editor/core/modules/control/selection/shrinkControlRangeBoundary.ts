import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'
import { IRange } from '../../../../interface/Range'

/** 按控件组件边界收缩当前编辑范围。 */
export function shrinkControlRangeBoundary(payload: {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 待收缩的 range，函数会原地更新其边界。 */
  range: IRange
  /** range 起点元素。 */
  startElement: IElement
  /** range 终点元素。 */
  endElement: IElement
}) {
  const { elementList, range, startElement, endElement } = payload
  const { startIndex, endIndex } = range
  if (startIndex === endIndex) {
    if (startElement.controlComponent === ControlComponent.PLACEHOLDER) {
      let index = startIndex - 1
      while (index > 0) {
        const preElement = elementList[index]
        if (
          preElement.controlId !== startElement.controlId ||
          preElement.controlComponent === ControlComponent.PREFIX ||
          preElement.controlComponent === ControlComponent.PRE_TEXT
        ) {
          range.startIndex = index
          range.endIndex = index
          break
        }
        index--
      }
    }
    return
  }

  if (
    startElement.controlComponent === ControlComponent.PLACEHOLDER ||
    endElement.controlComponent === ControlComponent.PLACEHOLDER
  ) {
    let index = endIndex - 1
    while (index > 0) {
      const preElement = elementList[index]
      if (
        preElement.controlId !== endElement.controlId ||
        preElement.controlComponent === ControlComponent.PREFIX ||
        preElement.controlComponent === ControlComponent.PRE_TEXT
      ) {
        range.startIndex = index
        range.endIndex = index
        return
      }
      index--
    }
  }

  if (startElement.controlComponent === ControlComponent.PREFIX) {
    let index = startIndex + 1
    while (index < elementList.length) {
      const nextElement = elementList[index]
      if (
        nextElement.controlId !== startElement.controlId ||
        nextElement.controlComponent === ControlComponent.VALUE
      ) {
        range.startIndex = index - 1
        break
      }
      if (nextElement.controlComponent === ControlComponent.PLACEHOLDER) {
        range.startIndex = index - 1
        range.endIndex = index - 1
        return
      }
      index++
    }
  }

  if (endElement.controlComponent !== ControlComponent.VALUE) {
    let index = startIndex - 1
    while (index > 0) {
      const preElement = elementList[index]
      if (
        preElement.controlId !== startElement.controlId ||
        preElement.controlComponent === ControlComponent.VALUE
      ) {
        range.startIndex = index
        break
      }
      if (preElement.controlComponent === ControlComponent.PLACEHOLDER) {
        range.startIndex = index
        range.endIndex = index
        return
      }
      index--
    }
  }
}
