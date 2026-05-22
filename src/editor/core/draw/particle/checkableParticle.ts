import { NBSP, ZERO } from '../../../dataset/constant/Common'
import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { Draw } from '../Draw'

export interface ICheckableRenderOption {
  ctx: CanvasRenderingContext2D
  x: number
  y: number
  row: IRow
  index: number
}

interface ICheckableStyleOption {
  gap: number
  lineWidth: number
  fillStyle: string
  strokeStyle: string
  verticalAlign: VerticalAlign
}

export function toggleCheckableElement(
  draw: Draw,
  element: IElement,
  type: 'checkbox' | 'radio'
) {
  if (type === 'checkbox') {
    const { checkbox } = element
    if (checkbox) {
      checkbox.value = !checkbox.value
    } else {
      element.checkbox = { value: true }
    }
  } else {
    const { radio } = element
    if (radio) {
      radio.value = !radio.value
    } else {
      element.radio = { value: true }
    }
  }
  draw.render({
    isCompute: false,
    isSetCursor: false,
    pageRenderScope: 'visible'
  })
}

export function resolveCheckableRenderState(
  payload: ICheckableRenderOption,
  options: DeepRequired<IEditorOption>,
  styleOption: ICheckableStyleOption
) {
  const { ctx, x, index, row } = payload
  let { y } = payload
  const { gap, lineWidth, fillStyle, strokeStyle, verticalAlign } = styleOption
  const { scale } = options
  const { metrics } = row.elementList[index]
  if (
    verticalAlign === VerticalAlign.TOP ||
    verticalAlign === VerticalAlign.MIDDLE
  ) {
    let nextIndex = index + 1
    let nextElement: IRowElement | null = null
    while (nextIndex < row.elementList.length) {
      nextElement = row.elementList[nextIndex]
      if (nextElement.value !== ZERO && nextElement.value !== NBSP) break
      nextIndex++
    }
    if (nextElement) {
      const {
        metrics: { boundingBoxAscent, boundingBoxDescent }
      } = nextElement
      const textHeight = boundingBoxAscent + boundingBoxDescent
      if (textHeight > metrics.height) {
        if (verticalAlign === VerticalAlign.TOP) {
          y -= boundingBoxAscent - metrics.height
        } else if (verticalAlign === VerticalAlign.MIDDLE) {
          y -= (textHeight - metrics.height) / 2
        }
      }
    }
  }
  return {
    ctx,
    left: Math.round(x + gap * scale),
    top: Math.round(y - metrics.height + lineWidth),
    width: metrics.width - gap * 2 * scale,
    height: metrics.height,
    lineWidth,
    fillStyle,
    strokeStyle,
    scale
  }
}
