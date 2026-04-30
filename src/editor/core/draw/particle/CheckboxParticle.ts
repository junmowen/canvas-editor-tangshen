import { NBSP, ZERO } from '../../../dataset/constant/Common'
import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { Draw } from '../Draw'

/**
 * 复选框渲染选项接口。
 */
interface ICheckboxRenderOption {
  /** 画布上下文 */
  ctx: CanvasRenderingContext2D
  /** X 坐标 */
  x: number
  /** Y 坐标 */
  y: number
  /** 行 */
  row: IRow
  /** 元素索引 */
  index: number
}

/**
 * 复选框粒子。
 *
 * 负责复选框的渲染和选中状态管理。
 */
export class CheckboxParticle {
  /** Draw 门面对象 */
  private draw: Draw
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
  }

  /**
   * 设置复选框选中状态。
   *
   * @param element - 复选框元素
   */
  public setSelect(element: IElement) {
    const { checkbox } = element
    // 切换复选框状态
    if (checkbox) {
      checkbox.value = !checkbox.value
    } else {
      // 如果复选框对象不存在，创建并设置为选中
      element.checkbox = {
        value: true
      }
    }
    // 重新渲染
    this.draw.render({
      isCompute: false,
      isSetCursor: false,
      pageRenderScope: 'visible'
    })
  }

  /**
   * 渲染复选框。
   *
   * @param payload - 渲染参数
   */
  public render(payload: ICheckboxRenderOption) {
    const { ctx, x, index, row } = payload
    let { y } = payload
    const {
      checkbox: { gap, lineWidth, fillStyle, strokeStyle, verticalAlign },
      scale
    } = this.options
    const { metrics, checkbox } = row.elementList[index]
    // 垂直布局设置
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
      // 以后一个非空格元素为基准
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
    // left top 四舍五入避免1像素问题
    const left = Math.round(x + gap * scale)
    const top = Math.round(y - metrics.height + lineWidth)
    const width = metrics.width - gap * 2 * scale
    const height = metrics.height
    ctx.save()
    ctx.beginPath()
    ctx.translate(0.5, 0.5)
    // 绘制勾选状态
    if (checkbox?.value) {
      // 边框
      ctx.lineWidth = lineWidth
      ctx.strokeStyle = fillStyle
      ctx.rect(left, top, width, height)
      ctx.stroke()
      // 背景色
      ctx.beginPath()
      ctx.fillStyle = fillStyle
      ctx.fillRect(left, top, width, height)
      // 勾选对号
      ctx.beginPath()
      ctx.strokeStyle = strokeStyle
      ctx.lineWidth = lineWidth * 2 * scale
      ctx.moveTo(left + 2 * scale, top + height / 2)
      ctx.lineTo(left + width / 2, top + height - 3 * scale)
      ctx.lineTo(left + width - 2 * scale, top + 3 * scale)
      ctx.stroke()
    } else {
      ctx.lineWidth = lineWidth
      ctx.rect(left, top, width, height)
      ctx.stroke()
    }
    ctx.closePath()
    ctx.restore()
  }
}
