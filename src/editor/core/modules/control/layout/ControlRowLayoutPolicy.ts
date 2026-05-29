import {
  ControlComponent,
  ControlIndentation
} from '../../../../dataset/enum/Control'
import { IRow, IRowElement } from '../../../../interface/Row'
import type { Draw } from '../../../draw/Draw'

/** 消费控件 minWidth 行布局状态，并在后缀元素处应用最终偏移。 */
export function consumeMinWidthControlLayout(payload: {
  draw: Draw
  row: IRow
  rowElement: IRowElement
  availableWidth: number
  controlRealWidth: number
}) {
  const { draw, row, rowElement, availableWidth, controlRealWidth } = payload
  if (!rowElement.control?.minWidth) return controlRealWidth
  let nextControlRealWidth = controlRealWidth
  if (rowElement.controlComponent) {
    nextControlRealWidth += rowElement.metrics.width
  }
  if (rowElement.controlComponent === ControlComponent.POSTFIX) {
    draw.getControl().setMinWidthControlInfo({
      row,
      rowElement,
      availableWidth,
      controlRealWidth: nextControlRealWidth
    })
    return 0
  }
  return nextControlRealWidth
}

/** 解析 VALUE_START 缩进在换行后应继承的横向偏移。 */
export function resolveValueStartIndentOffset(payload: {
  draw: Draw
  row: IRow
  rowElement: IRowElement
}) {
  const { draw, row, rowElement } = payload
  if (
    rowElement.controlComponent === ControlComponent.PREFIX ||
    rowElement.control?.indentation !== ControlIndentation.VALUE_START
  ) {
    return null
  }
  const preStartIndex = row.elementList.findIndex(
    element =>
      element.controlId === rowElement.controlId &&
      element.controlComponent !== ControlComponent.PREFIX
  )
  if (!~preStartIndex) return null
  const preRowPositionList = draw.getCoordinate().computeRowPosition({
    row,
    innerWidth: draw.getInnerWidth()
  })
  return preRowPositionList[preStartIndex]?.coordinate.leftTop[0] ?? null
}
