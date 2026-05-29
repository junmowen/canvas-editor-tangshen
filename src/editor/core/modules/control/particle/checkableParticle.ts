import { NBSP, ZERO } from '../../../../dataset/constant/Common'
import { VerticalAlign } from '../../../../dataset/enum/VerticalAlign'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement } from '../../../../interface/Element'
import { IRow, IRowElement } from '../../../../interface/Row'
import { Draw } from '../../../draw/Draw'

/** checkable渲染选项，用于约束调用方可传入的可选配置。 */
export interface ICheckableRenderOption {
  /** Canvas 2D 上下文，用于执行当前绘制指令。 */
  ctx: CanvasRenderingContext2D
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
}

/** checkable样式选项，用于约束调用方可传入的可选配置。 */
interface ICheckableStyleOption {
  /** 间距值，用于控制元素之间的空白距离。 */
  gap: number
  /** 线宽，用于设置 Canvas 描边粗细。 */
  lineWidth: number
  /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
  fillStyle: string
  /** 描边样式，用于设置 Canvas 线条颜色或图案。 */
  strokeStyle: string
  /** 垂直对齐方式，用于控制元素在行内或单元格内的位置。 */
  verticalAlign: VerticalAlign
}

/** 切换checkable元素，在不同显示或交互状态之间切换。 */
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
