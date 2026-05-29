import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'
import {
  ICheckableRenderOption,
  resolveCheckableRenderState,
  toggleCheckableElement
} from './checkableParticle'

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
    toggleCheckableElement(this.draw, element, 'checkbox')
  }

  /**
   * 渲染复选框。
   *
   * @param payload - 渲染参数
   */
  public render(payload: ICheckableRenderOption) {
    const { checkbox } = payload.row.elementList[payload.index]
    const {
      ctx,
      left,
      top,
      width,
      height,
      lineWidth,
      fillStyle,
      strokeStyle,
      scale
    } = resolveCheckableRenderState(
      payload,
      this.options,
      this.options.checkbox
    )
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
