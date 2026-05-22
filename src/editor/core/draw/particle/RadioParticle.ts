import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { Draw } from '../Draw'
import {
  ICheckableRenderOption,
  resolveCheckableRenderState,
  toggleCheckableElement
} from './checkableParticle'

export class RadioParticle {
  private draw: Draw
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
  }

  public setSelect(element: IElement) {
    toggleCheckableElement(this.draw, element, 'radio')
  }

  public render(payload: ICheckableRenderOption) {
    const { radio } = payload.row.elementList[payload.index]
    const {
      ctx,
      left,
      top,
      width,
      height,
      lineWidth,
      fillStyle,
      strokeStyle
    } = resolveCheckableRenderState(payload, this.options, this.options.radio)
    ctx.save()
    ctx.beginPath()
    ctx.translate(0.5, 0.5)
    // 边框
    ctx.strokeStyle = radio?.value ? fillStyle : strokeStyle
    ctx.lineWidth = lineWidth
    ctx.arc(left + width / 2, top + height / 2, width / 2, 0, Math.PI * 2)
    ctx.stroke()
    // 填充选中色
    if (radio?.value) {
      ctx.beginPath()
      ctx.fillStyle = fillStyle
      ctx.arc(left + width / 2, top + height / 2, width / 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.closePath()
    ctx.restore()
  }
}
